require('./style/index.less');

var React = require('react');
var uskin = require('client/uskin/index');
var Button = uskin.Button;
var MainTable = require('client/components/main_table/index');
var BasicProps = require('client/components/basic_props/index');
var DetailSubnet = require('client/components/detail_subnet/index');
var config = require('./config.json');
var __ = require('i18n/client/lang.json');
var router = require('client/dashboard/cores/router');
var request = require('./request');

class Model extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      config: config
    };

    this.bindEventList = this.bindEventList.bind(this);
    this.clearTableState = this.clearTableState.bind(this);
    this._eventList = {};
    this._stores = {
      checkedRow: []
    };
  }

  componentWillMount() {
    this.bindEventList();
    this.setTableColRender(config.table.column);
    this.listInstance();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.style.display === 'none' && this.props.style.display === 'none') {
      return false;
    }
    return true;
  }

  bindEventList() {
    this._eventList = {
      clickBtns: this.clickBtns.bind(this),
      updateBtns: this.updateBtns.bind(this),
      changeSearchInput: this.changeSearchInput,
      clickTableCheckbox: this.clickTableCheckbox.bind(this),
      clickDetailTabs: this.clickDetailTabs.bind(this)
    };
  }

  clickDetailTabs(tab, item, callback) {
    switch(tab.key) {
      case 'dscr':
        if (item.length > 1) {
          callback(
            <div className="no-data-desc">
              <p>{__.view_is_unavailable}</p>
            </div>
          );
          break;
        }

        var basicPropsItem = this.getBasicPropsItems(item[0]),
          subnetItems = this.getDetailSubnetItems(item[0]);
        callback(
          <div>
            <BasicProps
              title={__.basic + __.properties}
              defaultUnfold={true}
              items={basicPropsItem ? basicPropsItem : []} />
            <DetailSubnet
              title={__.subnet}
              defaultUnfold={true}
              items={subnetItems ? subnetItems : []}>
              <Button value={__.create + __.subnet}/>
            </DetailSubnet>
          </div>
        );
        break;
      default:
        callback(null);
    }
  }

  getBasicPropsItems(item) {
    var items = [{
      title: __.name,
      content: item.name
    }, {
      title: __.id,
      content: item.id
    }, {
      title: __.unmanaged + __.network,
      content: ''
    }, {
      title: __.status,
      type: 'status',
      status: item.status,
      content: __[item.status.toLowerCase()]
    }, {
      title: __.create + __.time,
      type: 'time',
      content: item.created
    }];

    return items;
  }

  getDetailSubnetItems(item) {
    //this is fake data, please fix it.
    var subnet = [{
      title: 'testing01',
      cidr: '192.168.0.0',
      router: '',
      create: <i className="glyphicon icon-delete" />
    }, {
      title: 'testing02',
      cidr: '192.168.0.0',
      router: '',
      create: <i className="glyphicon icon-delete" />
    }];

    return subnet;
  }

  updateTableData(data) {
    var path = router.getPathList();
    var _conf = this.state.config;
    _conf.table.data = data;

    this.setState({
      config: _conf
    }, () => {
      if (path.length > 2 && data && data.length > 0) {
        router.replaceState(router.getPathName(), null, null, true);
      }
    });
  }

  loadingTable() {
    this.updateTableData(null);
  }

  listInstance() {
    var that = this;

    this.loadingTable();
    request.listInstances().then(function(data) {
      that.updateTableData(data.networks);
    }, function(err) {
      that.updateTableData([]);
      console.debug(err);
    });
  }

  setTableColRender(column) {
    column.map((col) => {
      switch (col.key) {
        case 'subnet':
          col.render = (rcol, ritem, rindex) => {
            var listener = (subnetID) => {
              router.pushState('/project/subnet/' + subnetID);
            };

            var subnetRender = [];
            ritem.subnets.map((item, i) => {
              i && subnetRender.push(', ');
              subnetRender.push(<a key={i} onClick={listener.bind(null, item.id)} style={{cursor: 'pointer'}}>{item.name}</a>);
            });

            return ritem.subnets.length ? <div>{subnetRender.map((item) => item)}</div> : '';
          };
          break;
        case 'umngd_ntw':
          col.render = (rcol, ritem, rindex) => {
            return ritem.admin_state_up ? __.yes : __.no;
          };
          break;
        default:
          break;
      }
    });
  }

  clickTableCheckbox(e, status, clickedRow, arr) {
    // console.log('tableOnClick: ', e, status, clickedRow, arr);
    this.updateBtns(status, clickedRow, arr);
  }

  clearTableState() {
    this.refs.dashboard.clearTableState();
  }

  clickBtns(e, key) {
    switch (key) {
      case 'create':
        break;
      case 'refresh':
        this.refresh();
        break;
      default:
        break;
    }
  }

  refresh() {
    this.listInstance();
    this.refs.dashboard.clearState();
  }

  updateBtns(status, clickedRow, arr) {
    var _conf = this.state.config,
      btns = _conf.btns;

    btns.map((btn) => {
      switch(btn.key) {
        case 'crt_subnet':
          btn.disabled = (arr.length === 1) ? false : true;
          break;
        case 'delete':
          btn.disabled = (arr.length === 1) ? false : true;
          break;
        default:
          break;
      }
    });

    this._stores.checkedRow = arr;
    this.setState({
      config: _conf
    });
  }

  changeSearchInput(str) {
    // console.log('search:', str);
  }

  render() {

    return (
      <div className="halo-module-network" style={this.props.style}>
        <MainTable ref="dashboard" moduleID="network" config={this.state.config} eventList={this._eventList} />
      </div>
    );
  }

}

module.exports = Model;
