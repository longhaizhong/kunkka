require('./style/index.less');

//react components
var React = require('react');
var Main = require('client/components/main/index');

//detail components
var DetailMinitable = require('client/components/detail_minitable/index');
var RelatedSources = require('client/components/related_sources/index');
var BasicProps = require('client/components/basic_props/index');

//pop modal
var deleteModal = require('client/components/modal_delete/index');
//var create = require('./pop/create/index');

var config = require('./config.json');
var __ = require('locale/client/dashboard.lang.json');
var request = require('./request');
var router = require('client/utils/router');
var msgEvent = require('client/applications/dashboard/cores/msg_event');
var getStatusIcon = require('../../utils/status_icon');
var getTime = require('client/utils/time_unification');
var utils = require('../../utils/utils');

class Model extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      config: config
    };

    ['onInitialize', 'onAction'].forEach((m) => {
      this[m] = this[m].bind(this);
    });
  }

  componentWillMount() {
    var columns = this.state.config.table.column;
    this.tableColRender(columns);

    msgEvent.on('dataChange', (data) => {
      if (this.props.style.display !== 'none') {
        if (data.resource_type === 'heat') {
          this.refresh({
            detailRefresh: true
          }, false);

          var path = router.getPathList();
          if (data.action === 'delete' && data.stage === 'end' && data.resource_id === path[2]) {
            router.replaceState('/dashboard/' + path[1]);
          }
        }
      }
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.style.display === 'none' && !nextState.config.table.loading) {
      return false;
    }
    return true;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.style.display !== 'none' && this.props.style.display === 'none') {
      if (this.state.config.table.loading) {
        this.loadingTable();
      } else {
        this.getTableData(false);
      }
    }
  }

  tableColRender(column) {
    column.map((col) => {
      switch (col.key) {
        default:
          break;
      }
    });
  }

  onInitialize(params) {
    this.getTableData(false);
  }

  getTableData(forceUpdate, detailRefresh) {
    request.getList(forceUpdate).then((res) => {
      var _config = this.state.config;

      var table = _config.table;
      table.data = res;
      table.loading = false;

      var detail = this.refs.dashboard.refs.detail;
      if (detail && detail.state.loading) {
        detail.setState({
          loading: false
        });
      }

      this.setState({
        config: _config
      }, () => {
        if (detail && detailRefresh) {
          detail.refresh();
        }
      });
    });
  }

  onAction(field, actionType, refs, data) {
    switch (field) {
      case 'btnList':
        this.onClickBtnList(data.key, refs, data);
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

  onClickBtnList(key, refs, data) {
    var rows = data.rows;
    switch (key) {
      case 'create':
        //create();
        break;
      case 'delete':
        deleteModal({
          __: __,
          action: 'delete',
          type: 'image',
          data: rows,
          onDelete: function(_data, cb) {
            request.deleteImage(rows[0].id).then((res) => {
              cb(true);
            });
          }
        });
        break;
      case 'refresh':
        this.refresh({
          tableLoading: true,
          detailLoading: true,
          clearState: true,
          detailRefresh: true
        }, true);
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
    for (let key in btns) {
      switch (key) {
        case 'delete':
          btns[key].disabled = rows.length >= 1 ? false : true;
          break;
        default:
          break;
      }
    }

    return btns;
  }

  onClickDetailTabs(tabKey, refs, data) {
    var {
      rows
    } = data;
    var detail = refs.detail;
    var contents = detail.state.contents;
    var syncUpdate = true;

    var isAvailableView = (_rows) => {
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

    switch (tabKey) {
      case 'description':
        syncUpdate = false;
        if (isAvailableView(rows)) {
          request.getSingle(rows[0]).then(res => {
            var basicPropsItem = this.getItem(res.stack);
            contents[tabKey] = (
              <div>
                <RelatedSources
                  title={__.basic + __.properties}
                  tabKey={'description'}
                  defaultUnfold={true}
                  items={basicPropsItem}
                  rawItem={rows[0]}
                  __={__} />
              </div>
            );
            detail.setState({
              contents: contents,
              loading: false
            });
          });
        }
        break;
      case 'resource':
        syncUpdate = false;
        request.getResource(rows[0]).then(resources => {
          var resourcesConfig = this.getResourceConfig(resources);
          contents[tabKey] = (
            <DetailMinitable
              __={__}
              title={__.resources}
              defaultUnfold={true}
              tableConfig={resourcesConfig ? resourcesConfig : []} />
          );

          detail.setState({
            contents: contents,
            loading: false
          });
        });
        break;
      case 'events':
        syncUpdate = false;
        request.getEvents(rows[0]).then(events => {
          var eventsConfig = this.getEventsConfig(events.events);
          contents[tabKey] = (
            <DetailMinitable
              __={__}
              title={__.events}
              defaultUnfold={true}
              tableConfig={eventsConfig ? eventsConfig : []} />
          );

          detail.setState({
            contents: contents,
            loading: false
          });
        });
        break;
      case 'template':
        syncUpdate = false;
        request.getTemplate(rows[0]).then(template => {
          var templateParams = this.getTemplateParams(template);
          var templateRes = this.getTemplateRes(template);
          contents[tabKey] = (
            <div>
              <BasicProps
                title={__.properties}
                defaultUnfold={true}
                tabKey={'template'}
                items={templateParams}
                rawItem={rows[0]}/>
              <BasicProps
                title={__.resource}
                defaultUnfold={true}
                tabKey={'template'}
                items={templateRes}
                rawItem={rows[0]}/>
            </div>
          );

          detail.setState({
            contents: contents,
            loading: false
          });
        });
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

  getItem(item) {
    var basicProps = [], statusProps = [], parameters = [], createParameters = [];
    var vid = '(' + item.id.slice(0, 8) + ')',
      vname = item.stack_name || vid;
    basicProps.push({
      key: __.name,
      data: vname
    }, {
      key: __.id,
      type: 'id',
      data: item.id
    }, {
      key: __.description,
      data: item.description
    });

    statusProps.push({
      key: __.create + __.time,
      data: getTime(item.creation_time, false)
    }, {
      key: __.update + __.time,
      data: item.updated_time ? getTime(item.updated_time, false) : '-'
    }, {
      key: __.status,
      data: item.stack_status_reason
    });

    for(var i in item.parameters) {
      parameters.push({
        key: i,
        data: item.parameters[i]
      });
    }

    createParameters.push({
      key: __.time_out,
      data: item.timeout_mins + __.minutes
    }, {
      key: __.rollback,
      data: __[item.disable_rollback.toString()]
    });

    var data = [{
      title: __.basic + __.properties,
      key: 'basic',
      type: 'list',
      content: basicProps
    }, {
      title: __.status,
      key: 'status',
      type: 'list',
      content: statusProps
    }, {
      title: __.output,
      key: 'basic',
      type: 'list',
      content: []
    }, {
      title: __.parameters,
      key: 'basic',
      type: 'list',
      content: parameters
    }, {
      title: __.create + __.parameters,
      key: 'basic',
      type: 'list',
      content: createParameters
    }];

    return data;
  }

  getResourceConfig(item) {
    var tableContent = [];
    item.resources.forEach((element, index) => {
      var dataObj = {
        id: index + 1,
        resource_name: element.resource_name,
        physical_resource_id: <a data-type="router" href={'/dashboard/' + utils.getResourceType(element.resource_type.split('::')[2]) + '/' + element.physical_resource_id}>
            {element.physical_resource_id}
          </a>,
        resource_type: element.resource_type,
        resource_status: getStatusIcon(element.resource_status),
        updated_time: getTime(element.updated_time, false),
        resource_status_reason: element.resource_status_reason
      };
      tableContent.push(dataObj);
    });
    var tableConfig = {
      column: [{
        title: __.name,
        key: 'name',
        dataIndex: 'resource_name'
      }, {
        title: __.resource + __.id,
        key: 'physical_resource_id',
        dataIndex: 'physical_resource_id'
      }, {
        title: __.resource + __.type,
        key: 'type',
        dataIndex: 'resource_type'
      }, {
        title: __.update + __.time,
        key: 'update',
        dataIndex: 'updated_time'
      }, {
        title: __.status,
        key: 'status',
        dataIndex: 'resource_status'
      }, {
        title: __.status + __.reason,
        key: 'reason',
        dataIndex: 'resource_status_reason'
      }],
      data: tableContent,
      dataKey: 'id',
      hover: true
    };

    return tableConfig;
  }

  getEventsConfig(events) {
    let tableContent = [];
    events.forEach((ele, index) => {
      let dataObj = {
        id: index + 1,
        logical_resource_id: ele.logical_resource_id,
        physical_resource_id: ele.physical_resource_id,
        event_time: getTime(ele.event_time, false),
        resource_status: getStatusIcon(ele.resource_status),
        resource_status_reason: ele.resource_status_reason
      };
      tableContent.push(dataObj);
    });
    var tableConfig = {
      column: [{
        title: __.stack + __.resource,
        key: 'logical_resource_id',
        dataIndex: 'logical_resource_id'
      }, {
        title: __.resource,
        key: 'physical_resource_id',
        dataIndex: 'physical_resource_id'
      }, {
        title: __.time_since_events,
        key: 'event_time',
        dataIndex: 'event_time'
      }, {
        title: __.status,
        key: 'resource_status',
        dataIndex: 'resource_status'
      }, {
        title: __.status + __.reason,
        key: 'resource_status_reason',
        dataIndex: 'resource_status_reason'
      }],
      data: tableContent,
      dataKey: 'id',
      hover: true
    };

    return tableConfig;
  }

  getTemplateParams(template) {
    var items = [{
      title: __.description,
      content: template.description
    }, {
      title: __.template + __.version,
      content: template.heat_template_version
    }];

    return items;
  }

  getTemplateRes(template) {
    /*var items = [{
    }];*/

    return [];
  }

  refresh(data, forceUpdate) {
    if (data) {
      var path = router.getPathList();
      if (path[2]) {
        if (data.detailLoading) {
          this.refs.dashboard.refs.detail.loading();
        }
      } else {
        if (data.tableLoading) {
          this.loadingTable();
        }
        if (data.clearState) {
          this.refs.dashboard.clearState();
        }
      }
    }

    this.getTableData(forceUpdate, data ? data.detailRefresh : false);
  }

  loadingTable() {
    var _config = this.state.config;
    _config.table.loading = true;

    this.setState({
      config: _config
    });
  }

  render() {
    return (
      <div className="halo-module-image" style={this.props.style}>
        <Main
          ref="dashboard"
          visible={this.props.style.display === 'none' ? false : true}
          onInitialize={this.onInitialize}
          onAction={this.onAction}
          config={this.state.config}
          params={this.props.params}
          getStatusIcon={getStatusIcon}
          __={__} />
      </div>
    );
  }

}

module.exports = Model;