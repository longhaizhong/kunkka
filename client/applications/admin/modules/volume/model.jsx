require('./style/index.less');

const React = require('react');
const Main = require('client/components/main_paged/index');
const BasicProps = require('client/components/basic_props/index');
const deleteModal = require('client/components/modal_delete/index');
const LineChart = require('client/components/line_chart/index');

const detachInstance = require('./pop/detach_instance/index');
const manageVolume = require('./pop/manage_volume/index');
const alarmDetail = require('./pop/alarm_detail/index');

const config = require('./config.json');
const moment = require('client/libs/moment');
const __ = require('locale/client/admin.lang.json');
const request = require('./request');
const getStatusIcon = require('../../utils/status_icon');
const utils = require('../../utils/utils');
const csv = require('./pop/csv/index');

class Model extends React.Component {

  constructor(props) {
    super(props);

    moment.locale(HALO.configs.lang);

    let enableAlarm = HALO.settings.enable_alarm;
    if (!enableAlarm) {
      let detail = config.table.detail.tabs;
      delete detail[1];
    }

    this.state = {
      config: config
    };

    ['onInitialize', 'onAction'].forEach((m) => {
      this[m] = this[m].bind(this);
    });

    this.stores = {
      urls: []
    };
  }

  componentWillMount() {
    this.tableColRender(this.state.config.table.column);
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
        case 'hosts':
          column.render = (col, item, i) => {
            return item['os-vol-host-attr:host'];
          };
          break;
        case 'size':
          column.render = (col, item, i) => {
            return item.size + 'GB';
          };
          break;
        case 'type':
          column.render = (col, item, i) => {
            return item.volume_type ?
              <span>
                <i className="glyphicon icon-performance" />
                {utils.getVolumeType(item)}
              </span> : '';
          };
          break;
        case 'shared':
          column.render = (col, item, i) => {
            return item.multiattach ? __.yes : __.no;
          };
          break;
        case 'attributes':
          column.render = (col, item, i) => {
            if (item.metadata.readonly) {
              return item.metadata.readonly === 'False' ? __.read_write : __.read_only;
            } else {
              return '';
            }
          };
          break;
        default:
          break;
      }
    });
  }

  initializeFilter(filters) {
    let setOption = function(key, data) {
      filters.forEach((filter) => {
        filter.items.forEach((item) => {
          if(item.key === key) {
            item.data = data;
          }
        });
      });
    };

    let statusTypes = [{
      id: 'available',
      name: __.available
    }, {
      id: 'in-use',
      name: __['in-use']
    }, {
      id: 'error',
      name: __.error
    }, {
      id: 'error_deleting',
      name: __.error_deleting
    }, {
      id: 'detaching',
      name: __.detaching
    }];
    setOption('status', statusTypes);
  }

  onInitialize(params) {
    let _config = this.state.config;
    this.loadingTable();
    this.initializeFilter(_config.filter);

    if (params && params[2]) {
      this.getSingle(params[2]);
    } else {
      this.getList();
    }
  }

  getInitialListData() {
    this.getList();
  }

  getList() {
    this.clearState();

    let table = this.state.config.table;
    let pageLimit = localStorage.getItem('page_limit');

    request.getList(pageLimit).then((res) => {
      table.data = res.list;
      this.setPaginationData(table, res);
      this.updateTableData(table, res._url);
    }).catch((res) => {
      table.data = [];
      table.pagination = null;
      this.updateTableData(table, String(res.responseURL));
    });
  }

  getSingle(volumeID) {
    this.clearState();

    let table = this.state.config.table;
    let pageLimit = localStorage.getItem('page_limit');

    request.getVolumeByID(volumeID, pageLimit).then((res) => {
      table.data = res.list;
      this.setPaginationData(table, res);
      this.updateTableData(table, res._url);
    }).catch((res) => {
      table.data = [];
      table.pagination = null;
      this.updateTableData(table, String(res.responseURL));
    });
  }

  getNextListData(url) {
    let table = this.state.config.table;

    request.getNextList(url).then((res) => {
      table.data = res.list;
      this.setPaginationData(table, res);
      this.updateTableData(table, res._url);
    }).catch((res) => {
      table.data = [];
      table.pagination = null;
      this.updateTableData(table, String(res.responseURL));
    });
  }

  getFilteredList(data) {
    let table = this.state.config.table;
    let pageLimit = localStorage.getItem('page_limit');
    request.filterFromAll(data, pageLimit).then((res) => {
      table.data = res.list;
      this.setPaginationData(table, res);
      this.updateTableData(table, res._url);
    }).catch((res) => {
      table.data = [];
      table.pagination = null;
      this.updateTableData(table, String(res.responseURL));
    });
  }

  onFilterSearch(actionType, refs, data) {
    this.clearState();

    if (actionType === 'search') {
      this.loadingTable();

      let volumeID = data.volume_id,
        allTenant = data.all_tenant;

      if (volumeID) {
        this.getSingle(volumeID.id);
      } else if (allTenant){
        this.getFilteredList(allTenant);
      } else {
        this.getInitialListData();
      }
    }
  }

  updateTableData(table, currentUrl, refreshDetail) {
    let newConfig = this.state.config;
    newConfig.table = table;
    newConfig.table.loading = false;

    this.setState({
      config: newConfig
    }, () => {
      this.stores.urls.push(currentUrl);

      let dashboard = this.refs.dashboard,
        detail = dashboard.refs.detail,
        params = this.props.params;

      if (detail && refreshDetail && params.length > 2) {
        detail.refresh();
      }
    });
  }

  setPaginationData(table, res) {
    let pagination = {},
      next = res.links.next ? res.links.next : null;

    if (next) {
      pagination.nextUrl = next;
    }

    let history = this.stores.urls;

    if (history.length > 0) {
      pagination.prevUrl = history[history.length - 1];
    }
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

      let history = this.stores.urls,
        url = history.pop();

      this.getNextListData(url, data.refreshDetail);
    }
  }

  loadingTable() {
    let _config = this.state.config;
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

    let dashboard = this.refs.dashboard;
    if (dashboard) {
      dashboard.clearState();
    }
  }

  onAction(field, actionType, refs, data) {
    let volume = data.rows[0];

    switch (field) {
      case 'filter':
        this.onFilterSearch(actionType, refs, data);
        break;
      case 'btnList':
        this.onClickBtnList(data.key, refs, data);
        break;
      case 'table':
        this.onClickTable(actionType, refs, data);
        break;
      case 'detail':
        if(volume.attachments[0]) {
          this.loadingDetail();
          request.getServerById(volume.attachments[0].server_id).then((res) => {
            this.onClickDetailTabs(actionType, refs, data, res.server);
          }).catch(() => {
            volume.attachments[0].disabled = true;
            this.onClickDetailTabs(actionType, refs, data);
          });
        } else {
          this.onClickDetailTabs(actionType, refs, data);
        }
        break;
      case 'page_limit':
        this.onInitialize();
        break;
      default:
        break;
    }
  }

  onClickBtnList(key, refs, data) {
    let rows = data.rows,
      that = this;

    switch (key) {
      case 'dissociate':
        detachInstance(rows[0], null, function() {
          that.refresh({
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      case 'export_csv':
        request.getFieldsList().then((res) => {
          csv(res);
        });
        break;
      case 'manage_volume':
        manageVolume(null, null, function() {
          that.refresh({
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      case 'delete':
        deleteModal({
          __: __,
          action: 'delete',
          type: 'volume',
          data: rows,
          onDelete: function(_data, cb) {
            request.deleteVolumes(rows).then((res) => {
              that.refresh({
                refreshList: true
              });
              cb(true);
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
    let {rows} = data,
      btnList = refs.btnList,
      btns = btnList.state.btns;

    btnList.setState({
      btns: this.btnListRender(rows, btns)
    });
  }

  btnListRender(rows, btns) {
    let len = rows.length;
    // let setBtnState = (key) => {
    //   request.getServerById(rows[0].attachments[0].server_id).then(() => {
    //     btns[key].disabled = false;
    //   }).catch(() => {
    //     btns[key].disabled = true;
    //   });
    // };

    for(let key in btns) {
      switch (key) {
        case 'dissociate':
          if((len === 1 && rows[0].status === 'in-use') && rows[0].attachments.length > 0) {
            // setBtnState(key);
            btns[key].disabled = false;
          } else {
            btns[key].disabled = true;
          }
          break;
        case 'manage_volume':
        case 'export_csv':
          btns[key].disabled = false;
          break;
        case 'delete':
          btns[key].disabled = (len > 0 && rows[0].status === 'available') ? false : true;
          break;
        default:
          break;
      }
    }

    return btns;
  }

  onClickTable(actionType, refs, data) {
    switch (actionType) {
      case 'check':
        this.onClickTableCheckbox(refs, data);
        break;
      case 'pagination':
        let url,
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
      case 'filtrate':
        delete data.rows;
        this.clearState();
        let table = this.state.config.table;
        if (data) {
          request.getFilterList(data).then(res => {
            table.data = res.list;
            this.setPaginationData(table, res);
            this.updateTableData(table, res._url);
          }).catch((res) => {
            table.data = [];
            table.pagination = null;
            this.updateTableData(table, String(res.responseURL));
          });
        }
        this.loadingTable();
        break;
      default:
        break;
    }
  }

  onClickDetailTabs(tabKey, refs, data, server) {
    let {rows} = data;
    let detail = refs.detail;
    let contents = detail.state.contents;

    let isAvailableView = (_rows) => {
      if (_rows.length > 1) {
        contents[tabKey] = (
          <div className="no-data-desc">
            <p>{__.view_is_unavailable}</p>
          </div>
        );
        return false;
      } else {
        return true;
      }
    };

    switch(tabKey) {
      case 'description':
        if (rows.length === 1) {
          let basicPropsItem = this.getBasicPropsItems(rows[0], server);

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
          detail.setState({
            contents: contents,
            loading: false
          });
        }
        break;
      case 'monitor':
        if (isAvailableView(rows)) {
          let that = this;

          let updateDetailMonitor = function(newContents, loading) {
            detail.setState({
              contents: newContents,
              loading: loading
            });
          };

          let time = data.time;

          //open detail without delaying
          contents[tabKey] = (<div/>);
          updateDetailMonitor(contents, true);

          let metricType = ['disk.device.read.bytes.rate', 'disk.device.write.bytes.rate', 'disk.device.read.requests.rate', 'disk.device.write.requests.rate'],
            telemerty = HALO.configs.telemerty,
            hour = telemerty.hour,
            day = telemerty.day,
            week = telemerty.week,
            month = telemerty.month,
            year = telemerty.year;

          let tabItems = [{
            name: __.three_hours,
            key: hour,
            value: hour,
            time: 'hour'
          }, {
            name: __.one_day,
            key: day,
            value: day,
            time: 'day'
          }, {
            name: __.one_week,
            key: week,
            value: week,
            time: 'week'
          }, {
            name: __.one_month,
            key: month,
            value: month,
            time: 'month'
          }, {
            name: __.one_year,
            key: year,
            value: year,
            time: 'year'
          }];

          let granularity = '', key = '';
          if (data.granularity) {
            granularity = data.granularity;
            key = data.key;
          } else {
            granularity = hour;
            key = hour;
            contents[tabKey] = (<div/>);
            updateDetailMonitor(contents, true);
          }

          tabItems.some((ele) => ele.key === key ? (ele.default = true, true) : false);

          let updateContents = (arr, xAxisData) => {
            let chartDetail = {
              key: key,
              item: rows[0],
              data: arr,
              granularity: granularity,
              time: time
            };
            contents[tabKey] = (
              <LineChart
                __={__}
                item={rows[0]}
                data={arr}
                granularity={granularity}
                tabItems={tabItems}
                className={'volume'}
                start={utils.getTime(time)}
                clickTabs={(e, tab, item) => {
                  that.onClickDetailTabs('monitor', refs, {
                    rows: rows,
                    granularity: tab.value,
                    key: tab.key,
                    time: tab.time
                  });
                }}
                clickParent={(page) => {
                  that.onDetailAction('description', 'chart_zoom', {
                    chartDetail: chartDetail,
                    page: page
                  });
                }} />
            );

            updateDetailMonitor(contents);
          };

          if (data.granularity) {
            updateContents([]);
          }
          //rows[0].attachments[0].server_id
          if (rows[0].attachments[0]) {
            let device = rows[0].attachments[0].device.split('/'), ids = [],
              resourceId = rows[0].attachments[0].server_id + '-' + device[device.length - 1];
            request.getNetworkResourceId(resourceId, granularity).then(res => {
              metricType.forEach(type => {
                res[0] && ids.push(res[0].metrics[type]);
              });
              if (res.length !== 0) {
                request.getMeasures(ids, granularity, utils.getTime(time)).then((_r) => {
                  let arr = _r.map((r, index) => ({
                    title: utils.getMetricName(metricType[index]),
                    unit: utils.getUnit('volume', metricType[index], r),
                    color: utils.getColor(metricType[index]),
                    yAxisData: utils.getChartData(r, granularity, utils.getTime(time), metricType[index], 'volume'),
                    xAxis: utils.getChartData(r, granularity, utils.getTime(time), metricType[index])
                  }));
                  updateContents(arr);
                });
              } else {
                contents[tabKey] = (
                  <div className="no-data-desc">
                    <p>{__.view_is_unavailable}</p>
                  </div>
                );
                updateDetailMonitor(contents, false);
              }
            }).catch(error => {
              updateContents([{}]);
            });
          } else {
            contents[tabKey] = (
              <div className="no-data-desc">
                <p>{__.volume + (rows[0].name ? rows[0].name : '(' + rows[0].id.substr(0, 8) + ')') + __.no_data + __.comma + __.view_is_unavailable}</p>
              </div>
            );
            updateDetailMonitor(contents, false);
          }
        }
        break;
      default:
        break;
    }
  }

  getBasicPropsItems(item, server) {
    let items = [{
      title: __.name,
      content: item.name || '(' + item.id.substr(0, 8) + ')',
      type: 'editable'
    }, {
      title: __.id,
      content: item.id
    }, {
      title: __.hosts,
      content: item['os-vol-host-attr:host']
    }, {
      title: __.size,
      content: item.size + 'GB'
    }, {
      title: __.attached_instance,
      content: item.attachments[0] ?
          <span>
            <i className="glyphicon icon-instance" />
            {item.attachments[0].disabled ?
              <span>{'(' + item.attachments[0].server_id.substr(0, 8) + ')'}</span> :
              <a data-type="router" href={'/admin/instance/' + item.attachments[0].server_id}>
                {server ? server.name : '(' + item.attachments[0].server_id.substr(0, 8) + ')'}
              </a>
            }
          </span> : '-'
    }, {
      title: __.type,
      content: utils.getVolumeType(item)
    }, {
      title: __.project + __.id,
      type: 'copy',
      content: item['os-vol-tenant-attr:tenant_id']
    }, {
      title: __.user + __.id,
      type: 'copy',
      content: item.user_id
    }, {
      title: __.attributes,
      content: (() => {
        if (item.metadata.readonly) {
          return item.metadata.readonly === 'False' ? __.read_write : __.read_only;
        } else {
          return '-';
        }
      })()
    }, {
      title: __.bootable,
      content: item.bootable === 'true' ? __.yes : __.no
    }, {
      title: __.status,
      content: getStatusIcon(item.status)
    }, {
      title: __.created + __.time,
      type: 'time',
      content: item.created_at
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
    switch(actionType) {
      case 'edit_name':
        let {rawItem, newName} = data;
        request.editVolumeName(rawItem, newName).then((res) => {
          this.refresh({
            refreshList: true,
            refreshDetail: true
          });
        });
        break;
      case 'chart_zoom':
        alarmDetail({
          type: 'chart',
          item: data
        });
        break;
      default:
        break;
    }
  }

  render() {
    return (
      <div className="halo-module-volume" style={this.props.style}>
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
