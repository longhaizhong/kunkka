'use strict';
const co = require('co');
const request = require('superagent');
const getQueryString = require('helpers/getQueryString.js');

const prefix = '/proxy-search';
const objects = [
  {
    name: 'hypervisor', re: /\/nova\/v2.1\/[a-z0-9]*\/os-hypervisors\/detail/i,
    hasPagination: false, service: 'nova', version: 'v2.1',
    match: 'hypervisor_hostname'
  },
  {
    name: 'server', re: /\/nova\/v2.1\/[a-z0-9]*\/servers\/detail/i,
    hasPagination: true, service: 'nova', version: 'v2.1'
  },
  {
    name: 'flavor', re: /\/nova\/v2.1\/[a-z0-9]*\/flavors\/detail/i,
    hasPagination: true, service: 'nova', version: 'v2.1'
  },
  {
    name: 'image', re: /\/glance\/v2\/images/i,
    hasPagination: true, linkKey: null, service: 'glance', version: 'v2', singleKey: false
  },
  {
    name: 'volume', re: /\/cinder\/v2\/[a-z0-9]*\/volumes\/detail/i,
    hasPagination: true, service: 'cinder', version: 'v2'
  },
  {
    name: 'snapshot', re: /\/cinder\/v2\/[a-z0-9]*\/snapshots\/detail/i,
    hasPagination: true, service: 'cinder', version: 'v2'
  },
  {
    name: 'floatingip', re: /\/neutron\/v2.0\/floatingips/i,
    hasPagination: true, service: 'neutron', version: 'v2.0',
    match: 'floating_ip_address'
  },
  {
    name: 'port', re: /\/neutron\/v2.0\/ports/i,
    hasPagination: true, service: 'neutron', version: 'v2.0'
  },
  {
    name: 'domain', re: /\/keystone\/v3\/domains/i,
    hasPagination: false, service: 'keystone', version: 'v3'
  },
  {
    name: 'project', re: /\/keystone\/v3\/projects/i,
    hasPagination: false, service: 'keystone', version: 'v3'
  },
  {
    name: 'user', re: /\/keystone\/v3\/users/i,
    hasPagination: false, service: 'keystone', version: 'v3'
  },
  {
    name: 'group', re: /\/keystone\/v3\/groups/i,
    hasPagination: false, service: 'keystone', version: 'v3'
  },
  {
    name: 'role', re: /\/keystone\/v3\/roles/i,
    hasPagination: false, service: 'keystone', version: 'v3'
  }
];

/**
 * toNaturalNumber
 * @param str
 * @return 0,1,2,3,...
 */
const toNaturalNumber = (str) => {
  const num = parseInt(str, 10);
  return (isNaN(num) || num < 0) ? 0 : num;
};

/**
 * paginate
 * @param page number
 * @param limit number
 * @param list array
 * @param path string
 * @param query object
 * @return object {list:[],links:{next,prev}}
 */
const paginate = (page, limit, list, path, query) => {
  const totalPage = Math.ceil(list.length / limit);
  const start = limit * (page - 1);
  const end = start + limit;
  const result = {
    list: list.slice(start, end),
    links: {next: null, prev: null}
  };
  if (page < totalPage) {
    result.links.next = prefix + path + getQueryString(Object.assign({page: page + 1, limit}, query));
  }
  if (page > 1) {
    result.links.prev = prefix + path + getQueryString(Object.assign({page: page - 1, limit}, query));
  }
  return result;
};

const detailRegExp = /s\/detail$/;
/**
 *
 * @param req
 * @param res
 * @param next
 * @return object {list:[], links:{next}}
 */
module.exports = (req, res, next) => {
  co(function *() {
    const token = req.session.user.token;
    const remote = req.session.endpoint;
    const region = req.session.user.regionId;
    const path = req.path.slice(prefix.length);
    const service = req.path.split('/')[2];
    const target = remote[service][region] + '/' + req.path.split('/').slice(3).join('/');
    const searchId = req.query.id ? req.query.id.trim() : '';
    const search = req.query.search ? req.query.search.trim() : '';
    const page = toNaturalNumber(req.query.page) || 1;
    const limit = toNaturalNumber(req.query.limit);
    delete req.query.search;

    let obj,
      data,   //data that OpenStack returned
      result; //result for this request

    objects.some(o => ((o.re.test(path)) && (obj = o)));
    if (!obj) {
      return next();
    }
    if (searchId) {
      try {
        const singleUrl = detailRegExp.test(target) ? target.replace(detailRegExp, 's/' + searchId) : target + '/' + searchId;
        let rs = yield request.get(singleUrl).set('X-Auth-Token', token);
        rs = obj.singleKey === false ? rs.body : rs.body[obj.name];
        result = {list: [rs], links: {next: null}};
      } catch (e) {
        if (e.status === 404) {
          result = {list: [], links: {next: null}};
        } else {
          throw e;
        }
      }
    } else if (!search) {
      data = yield request.get(target + getQueryString(req.query)).set('X-Auth-Token', token);
      data = data.body;
      delete req.query.page;
      delete req.query.id;
      if (!obj.hasPagination && limit) {
        result = paginate(page, limit, data[obj.name + 's'], path, req.query);
      } else {
        result = {list: data[obj.name + 's'], links: {prev: null, next: null}};
        if (obj.linkKey === null) {
          Object.keys(data).forEach(key => {
            if (key !== obj.name + 's' && data[key]) {
              result.links[key] = `${prefix}/${obj.service}/${obj.version}${data[key].split('/' + obj.version)[1]}`;
            }
          });
        } else if (data[obj.name + 's_links']) {
          data[obj.name + 's_links'].forEach(l => {
            result.links[l.rel] = `${prefix}/${obj.service}/${obj.version}${l.href.split('/' + obj.version)[1]}`;
          });
        }
      }
    } else {
      delete req.query.page;
      delete req.query.limit;
      delete req.query.marker;
      delete req.query.id;
      data = yield request.get(target + getQueryString(req.query)).set('X-Auth-Token', token);
      const re = new RegExp(search, 'i'),
        list = data.body[obj.name + 's'].filter(d => re.test(d[obj.match || 'name']));
      if (limit) {
        result = paginate(page, limit, list, path, Object.assign({search}, req.query));
      } else {
        result = {list, links: {next: null, prev: null}};
      }
    }
    res.send(result);
  }).catch(next);
};