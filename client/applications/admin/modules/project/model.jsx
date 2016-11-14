require('./style/index.less');

var React = require('react');
var Main = require('client/components/main_paged/index');
var {Button} = require('client/uskin/index');
var BasicProps = require('client/components/basic_props/index');
var DetailMinitable = require('client/components/detail_minitable/index');

var deleteModal = require('client/components/modal_delete/index');
var createProject = require('./pop/create/index');
var activateProject = require('./pop/activate/index');
var deactivateProject = require('./pop/deactivate/index');
var addUser = require('./pop/add_user/index');
var removeUser = require('./pop/remove_user/index');

var request = require('./request');
var config = require('./config.json');
var moment = require('client/libs/moment');
var __ = require('locale/client/admin.lang.json');
var getStatusIcon = require('../../utils/status_icon');
var router = require('client/utils/router');

class Model extends React.Component {

  constructor(props) {
    super(props);

    moment.locale(HALO.configs.lang);

    this.state = {
      config: config,
      domains: []
    };

    ['onInitialize', 'onAction'].forEach((m) => {
      this[m] = this[m].bind(this);
    });

    this.stores = {
      urls: []
    };
  }

  componentWillMount() {
    var that = this;
    this.tableColRender(this.state.config.table.column);
    request.getDomains().then((res) => {
      that.setState({
        domains: res
      });
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.style.display === 'none' && this.props.style.display === 'none') {
      return false;
    }
    return true;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.style.display !== 'none' && this.props.style.display === 'none') {
      this.loadingTable();
      this.onInitialize(nextProps.params);
    }
  }

  tableColRender(columns) {
    columns.map((column) => {
      switch (column.key) {
        case 'status':
          column.render = (col, item, i) => {
            return item.enabled ?
              <span className="label-active">{__.activated}</span> : <span className="label-down">{__.inactive}</span>;
          };
          break;
        default:
          break;
      }
    });
  }

  onInitialize(params) {
    if (params[2]) {
      this.getSingle(params[2]);
    } else {
      this.getList();
    }
  }

  getInitialListData() {
    this.getList();
  }

  getSingle(id) {
    this.clearState();

    var table = this.state.config.table;
    var filter = this.state.config.filter;
    request.getProjectByID(id).then((res) => {
      if (res.project) {
        table.data = [res.project];
      } else {
        table.data = [];
      }
      this.setPagination(table, res);
      this.initializeFilter(filter);
      this.updateTableData(table, res._url, true, () => {
        var pathList = router.getPathList();
        router.replaceState('/admin/' + pathList.slice(1).join('/'), null, null, true);
      });
    }).catch((res) => {
      table.data = [];
      table.pagination = {};
      this.updateTableData(table, res._url);
    });
  }

  getList() {
    this.clearState();

    var table = this.state.config.table;
    var filter = this.state.config.filter;
    request.getList(table.limit).then((res) => {
      table.data = res.projects;
      this.setPagination(table, res);
      this.initializeFilter(filter);
      this.updateTableData(table, res._url, () => {
        var pathList = router.getPathList();
        router.replaceState('/admin/' + pathList.slice(1).join('/'), null, null, true);
      });
    }).catch((res) => {
      table.data = [];
      table.pagination = {};
      this.updateTableData(table, res._url);
    });
  }

  initializeFilter(filters) {
    var domains = [];
    this.state.domains.forEach((item) => {
      domains.push({
        id: item.id,
        name: item.name
      });
    });
    filters[1].items[1].data = domains;
  }

  getFilterList(data) {
    this.clearState();

    var table = this.state.config.table;
    request.getFilteredList(data, table.limit).then((res) => {
      table.data = res.projects;
      this.setPagination(table, res);
      this.updateTableData(table, res._url, () => {
        var pathList = router.getPathList();
        router.replaceState('/admin/' + pathList.slice(1).join('/'), null, null, true);
      });
    }).catch((res) => {
      table.data = [];
      table.pagination = {};
      this.updateTableData(table, res._url);
    });
  }

  getNextListData(url, refreshDetail) {
    var table = this.state.config.table;
    request.getNextList(url).then((res) => {
      if (res.projects) {
        table.data = res.projects;
      } else if (res.project) {
        table.data = [res.project];
      } else {
        table.data = [];
      }
      this.setPagination(table, res);
      this.updateTableData(table, res._url, refreshDetail);
    }).catch((res) => {
      table.data = [];
      table.pagination = {};
      this.updateTableData(table, res._url);
    });
  }

  onFilterSearch(actionType, refs, data) {
    if (actionType === 'search') {
      this.loadingTable();

      var projectID = data.project,
        allTenant = data.all_tenant;

      if (projectID) {
        this.getSingle(projectID.id);
      } else if (allTenant) {
        this.getFilterList(allTenant);
      } else {
        this.getList();
      }
    }
  }

  updateTableData(table, currentUrl, refreshDetail, callback) {
    var newConfig = this.state.config;
    newConfig.table = table;
    newConfig.table.loading = false;

    this.setState({
      config: newConfig
    }, () => {
      if (currentUrl) {
        this.stores.urls.push(currentUrl);

        var detail = this.refs.dashboard.refs.detail,
          params = this.props.params;
        if (detail && refreshDetail && params.length > 2) {
          detail.refresh();
        }
        callback && callback();
      }
    });
  }

  setPagination(table, res) {
    var pagination = {};

    res.projects_links && res.projects_links.forEach((link) => {
      if (link.rel === 'prev') {
        pagination.prevUrl = link.href;
      } else if (link.rel === 'next') {
        pagination.nextUrl = link.href;
      }
    });
    table.pagination = pagination;

    return table;
  }

  refresh(data, params) {
    if (!data) {
      data = {};
    }
    if (!params) {
      params = this.props.params;
    }

    if (data.initialList) {
      if (data.loadingTable) {
        this.loadingTable();
      }
      if (data.clearState) {
        this.clearState();
      }

      this.getInitialListData();
    } else if (data.refreshList) {
      if (params[2]) {
        if (data.loadingDetail) {
          this.loadingDetail();
          this.refs.dashboard.setRefreshBtnDisabled(true);
        }
      } else {
        if (data.loadingTable) {
          this.loadingTable();
        }
      }

      var history = this.stores.urls,
        url = history.pop();

      this.getNextListData(url, data.refreshDetail);
    }
  }

  loadingTable() {
    var _config = this.state.config;
    _config.table.loading = true;

    this.setState({
      config: _config
    });
  }

  loadingDetail() {
    this.refs.dashboard.refs.detail.loading();
  }

  clearUrls() {
    this.stores.urls = [];
  }

  clearState() {
    this.clearUrls();

    var dashboard = this.refs.dashboard;
    if (dashboard) {
      dashboard.clearState();
    }
  }

  onAction(field, actionType, refs, data) {
    switch (field) {
      case 'btnList':
        this.onClickBtnList(data.key, refs, data);
        break;
      case 'filter':
        this.onFilterSearch(actionType, refs, data);
        break;
      case 'table':
        this.onClickTable(actionType, refs, data);
        break;
      case 'detail':
        this.onClickDetailTabs(actionType, refs, data);
        break;
      default:
        break;
    }
  }

  onClickTable(actionType, refs, data) {
    switch (actionType) {
      case 'check':
        this.onClickTableCheckbox(refs, data);
        break;
      case 'pagination':
        var url,
          history = this.stores.urls;

        if (data.direction === 'prev'){
          history.pop();
          if (history.length > 0) {
            url = history.pop();
          }
        } else if (data.direction === 'next') {
          url = data.url;
        } else {//default
          url = this.stores.urls[0];
          this.clearState();
        }

        this.loadingTable();
        this.getNextListData(url);
        break;
      default:
        break;
    }
  }

  onClickBtnList(key, refs, data) {
    var {rows} = data;

    var that = this;
    switch(key) {
      case 'create':
        createProject(null, null, function() {
          that.refresh({
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      case 'modify_project':
        createProject(rows[0], null, function() {
          that.refresh({
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      case 'activate_project':
        activateProject(rows[0], null, function() {
          that.refresh({
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      case 'deactivate_project':
        deactivateProject(rows[0], null, function() {
          that.refresh({
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      case 'modify_quota':
        break;
      case 'delete':
        deleteModal({
          __: __,
          action: 'delete',
          type: 'project',
          data: rows,
          onDelete: function(_data, cb) {
            request.deleteItem(rows).then((res) => {
              cb(true);
              that.refresh({
                refreshList: true,
                loadingTable: true
              });
            });
          }
        });
        break;
      case 'refresh':
        this.refresh({
          refreshList: true,
          refreshDetail: true,
          loadingTable: true,
          loadingDetail: true
        });
        break;
      default:
        break;
    }
  }

  onClickTableCheckbox(refs, data) {
    var {rows} = data,
      btnList = refs.btnList,
      btns = btnList.state.btns;

    btnList.setState({
      btns: this.btnListRender(rows, btns)
    });
  }

  btnListRender(rows, btns) {
    var singleRow = rows.length === 1;
    var status = singleRow ? rows[0].enabled : null;

    for(let key in btns) {
      switch (key) {
        case 'modify_project':
        case 'modify_quota':
          btns[key].disabled = !singleRow;
          break;
        case 'activate_project':
          btns[key].disabled = !singleRow || status;
          break;
        case 'deactivate_project':
          btns[key].disabled = !singleRow || !status;
          break;
        case 'delete':
          btns[key].disabled = !(rows.length > 0);
          break;
        default:
          break;
      }
    }

    return btns;
  }

  onClickDetailTabs(tabKey, refs, data) {
    var {rows} = data;
    var detail = refs.detail;
    var contents = detail.state.contents;
    var syncUpdate = true;

    switch(tabKey) {
      case 'description':
        if (rows.length === 1) {
          var basicPropsItem = this.getBasicPropsItems(rows[0]);
          contents[tabKey] = (
            <div>
              <BasicProps
                title={__.basic + __.properties}
                defaultUnfold={true}
                tabKey={'description'}
                items={basicPropsItem}
                rawItem={rows[0]}
                onAction={this.onDetailAction.bind(this)}
                dashboard={this.refs.dashboard ? this.refs.dashboard : null} />
            </div>
          );
        }
        break;
      case 'user':
        if (rows.length === 1) {
          syncUpdate = false;
          request.getUserIds(rows[0].id).then((roles) => {
            var userIds = [],
              assignments = {};
            roles.forEach((role) => {
              if (!assignments[role.user.id]) {
                assignments[role.user.id] = [];
                userIds.push(role.user.id);
              }
              assignments[role.user.id].push(role.role.id);
            });
            request.getUsers(userIds, assignments).then((res) => {
              var userConfig = this.getUserTableConfig(rows[0], res);
              contents[tabKey] = (
                <div>
                  <DetailMinitable
                    __={__}
                    title={__.user}
                    defaultUnfold={true}
                    tableConfig={userConfig ? userConfig : []}>
                    <Button value={__.add + __.user} onClick={this.onDetailAction.bind(this, 'description', 'add_user', {
                      rawItem: rows[0]
                    })}/>
                  </DetailMinitable>
                </div>
              );

              detail.setState({
                contents: contents,
                loading: false
              });
            });
          });
        }
        break;
      case 'quota':
        if (rows.length === 1) {
          syncUpdate = false;
          request.getQuotas(rows[0].id).then((res) => {
            var quotaItems = this.getQuotaItems(rows[0], res.quota);
            contents[tabKey] = (
              <div>
                <BasicProps
                  title={__.quota}
                  defaultUnfold={true}
                  tabKey={'description'}
                  items={quotaItems}
                  rawItem={rows[0]}
                  onAction={this.onDetailAction.bind(this)}
                  dashboard={this.refs.dashboard ? this.refs.dashboard : null} />
              </div>
            );
            detail.setState({
              contents: contents,
              loading: false
            });
          });
        }
        break;
      default:
        break;
    }

    if (syncUpdate) {
      detail.setState({
        contents: contents,
        loading: false
      });
    } else {
      detail.setState({
        loading: true
      });
    }
  }

  getUserTableConfig(item, users) {
    var dataContent = [];
    var role;
    users.forEach((element, index) => {
      role = [];
      element.role.forEach((r, i) => {
        if (i > 0) {
          role.push(', ');
        }
        role.push(<a data-type="router" key={r.id} href={'/admin/role'}>{r.name}</a>);
      });
      var dataObj = {
        id: element.id,
        name: <a data-type="router" href={'/admin/user/' + element.id}>{element.name}</a>,
        email: element.email,
        status: element.enabled ? __.activated : __.inactive,
        operation: <i className="glyphicon icon-delete" onClick={this.onDetailAction.bind(this, 'description', 'rmv_user', {
          rawItem: item,
          childItem: element
        })} />,
        role: <div>{role}</div>
      };
      dataContent.push(dataObj);
    });

    var tableConfig = {
      column: [{
        title: __.user + __.name,
        key: 'name',
        dataIndex: 'name'
      }, {
        title: __.id,
        key: 'id',
        dataIndex: 'id'
      }, {
        title: __.email,
        key: 'email',
        dataIndex: 'email'
      }, {
        title: __.role,
        key: 'role',
        dataIndex: 'role'
      }, {
        title: __.status,
        key: 'status',
        dataIndex: 'status'
      }, {
        title: __.operation,
        key: 'operation',
        dataIndex: 'operation'
      }],
      data: dataContent,
      dataKey: 'id',
      hover: true
    };

    return tableConfig;
  }

  getQuotaItems(item, quotas) {
    var ram = quotas.ram.total;
    if (ram > 0) {
      ram = Math.round(ram / 1024 * 100) / 100;
    }

    var items = [];
    Array.prototype.push.apply(items, [{
      title: __.instance,
      content: quotas.instances.total,
      type: 'editable',
      field: 'instances'
    }, {
      title: __.ram + '(GB)',
      content: ram,
      type: 'editable',
      field: 'ram'
    }, {
      title: __.cpu,
      content: quotas.cores.total,
      type: 'editable',
      field: 'cores'
    }]);

    items.push({
      title: __.volume + __.size + '(GB)',
      content: quotas.gigabytes.total,
      type: 'editable',
      field: 'gigabytes'
    });
    Object.keys(quotas).forEach((key) => {
      var type = key.split('gigabytes_')[1];
      if (type) {
        items.push({
          title: __.volume + (__[type] ? __[type] : ' ' + type + ' ') + __.size + '(GB)',
          content: quotas[key].total,
          type: 'editable',
          field: key
        });
      }
    });

    items.push({
      title: __.volume + __.quota,
      content: quotas.volumes.total,
      type: 'editable',
      field: 'volumes'
    });
    Object.keys(quotas).forEach((key) => {
      var type = key.split('volumes_')[1];
      if (type) {
        items.push({
          title: __.volume + (__[type] ? __[type] : ' ' + type + ' ') + __.quota,
          content: quotas[key].total,
          type: 'editable',
          field: key
        });
      }
    });

    items.push({
      title: __.snapshot + __.quota,
      content: quotas.snapshots.total,
      type: 'editable',
      field: 'snapshots'
    });
    Object.keys(quotas).forEach((key) => {
      var type = key.split('snapshots_')[1];
      if (type) {
        items.push({
          title: __.snapshot + (__[type] ? __[type] : ' ' + type + ' ') + __.quota,
          content: quotas[key].total,
          type: 'editable',
          field: key
        });
      }
    });

    Array.prototype.push.apply(items, [{
      title: __.floatingip,
      content: quotas.floatingip.total,
      type: 'editable',
      field: 'floatingip'
    }, {
      title: __.network,
      content: quotas.network.total,
      type: 'editable',
      field: 'network'
    }, {
      title: __.subnet,
      content: quotas.subnet.total,
      type: 'editable',
      field: 'subnet'
    }, {
      title: __.port,
      content: quotas.port.total,
      type: 'editable',
      field: 'port'
    }, {
      title: __.router,
      content: quotas.router.total,
      type: 'editable',
      field: 'router'
    }, {
      title: __.security_group,
      content: quotas.security_group.total,
      type: 'editable',
      field: 'security_group'
    }, {
      title: __.keypair,
      content: quotas.key_pairs.total,
      type: 'editable',
      field: 'key_pairs'
    }]);

    return items;
  }

  getBasicPropsItems(item) {
    var domainName = this.state.domains.find((domain) => {
      return domain.id === item.domain_id;
    });
    var items = [{
      title: __.name,
      content: item.name,
      type: 'editable'
    }, {
      title: __.id,
      content: item.id
    }, {
      title: __.domain,
      content: <a data-type="router" key={item.domain_id} href={'/admin/domain/' + item.domain_id}>{domainName.name}</a>
    }, {
      title: __.describe,
      content: item.description
    }, {
      title: __.status,
      content: item.enabled ? __.activated : __.inactive
    }];

    return items;
  }

  onDetailAction(tabKey, actionType, data) {
    switch(tabKey) {
      case 'description':
        this.onDescriptionAction(actionType, data);
        break;
      default:
        break;
    }
  }

  onDescriptionAction(actionType, data) {
    var that = this;
    switch(actionType) {
      case 'edit_name':
        var {item, rawItem, newName} = data;
        var quotaType = item.field;
        if (quotaType) {
          if (quotaType === 'ram') {
            newName = Number(newName);
            if (newName > 0) {
              newName *= 1024;
            }
          }
          request.modifyQuota(quotaType, rawItem.id, newName).then((res) => {
            this.refresh({
              loadingDetail: true,
              refreshList: true,
              refreshDetail: true
            });
          });
        } else {
          request.editProject(rawItem.id, {
            name: newName
          }).then((res) => {
            this.refresh({
              loadingDetail: true,
              refreshList: true,
              refreshDetail: true
            });
          });
        }
        break;
      case 'add_user':
        addUser(data.rawItem, null, function() {
          that.refresh({
            loadingDetail: true,
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      case 'rmv_user':
        removeUser({
          project: data.rawItem,
          user: data.childItem
        }, null, function() {
          that.refresh({
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      default:
        break;
    }
  }

  render() {
    return (
      <div className="halo-module-project" style={this.props.style}>
        <Main
          ref="dashboard"
          visible={this.props.style.display === 'none' ? false : true}
          onInitialize={this.onInitialize}
          onAction={this.onAction}
          __={__}
          config={this.state.config}
          params={this.props.params}
          getStatusIcon={getStatusIcon}
        />
      </div>
    );
  }
}

module.exports = Model;
