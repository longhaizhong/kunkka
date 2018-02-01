require('./style/index.less');

const React = require('react');
const request = require('./request');
const config = require('./config.json');
// const moment = require('client/libs/moment');
const __ = require('locale/client/bill.lang.json');
const converter = require('../../utils/converter');
const Detail = require('./detail');
const {Button, Tab, Table} = require('client/uskin/index');

class Model extends React.Component {
  constructor(props) {
    super(props);
    // moment.locale(HALO.configs.lang);

    this.state = {
      config: config,
      upLoading: true,
      loading: true
    };

    ['onInitialize', 'onAction'].forEach((m) => {
      this[m] = this[m].bind(this);
    });
  }

  componentWillMount() {
    converter.convertLang(__, this.state.config);
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
      this.onInitialize();
    }
  }

  tableColRender(columns) {
    columns.map((column) => {
      switch (column.key) {
        case 'total_cny':
          column.render = (col, item, i) => {
            return <span className="orange">{item.value}</span>;
          };
          break;
        default:
          break;
      }
    });
  }

  onInitialize() {
  }

  getList(current, limit) {
    this.loadingTable();
    if(current < 1) {
      current = 1;
    }
    let _config = this.state.config,
      table = _config.table;
    request.getList((current - 1) * limit, limit).then((res) => {
      table.data = res.charges;
      this.updateTableData(table, current, res.total_count, limit);
    }).catch(res => {
      table.data = [];
      this.updateTableData(table, res._url);
    });
  }

  updateTableData(table, current, totalNum, limit) {
    let newConfig = this.state.config;
    newConfig.table = table;
    newConfig.table.loading = false;

    if (totalNum > 0) {
      let total = Math.ceil(totalNum / limit);
      table.pagination = {
        current: current,
        total: total,
        total_num: totalNum
      };
    } else {
      table.pagination = null;
    }

    this.setState({
      config: newConfig
    });
  }

  onAction(field, actionType, refs, data) {
    switch (field) {
      case 'btnList':
        this.onClickBtnList(data.key, refs, data);
        break;
      case 'pagination':
        this.onNextPage(refs, data);
        break;
      default:
        break;
    }
  }

  onChangeTableCheckbox() {

  }

  setRefreshBtnDisabled(disabled) {
    let btnList = this.refs.btnList,
      btns = btnList.state.btns;

    btns.refresh.disabled = disabled;

    btnList.setState({
      btns: btns
    });
  }

  render() {
    const tabs = [{
      name: __['global-billing-record'],
      key: 'global-billing-record',
      default: true
    }];
    const state = this.state,
      _config = state.config,
      table = _config.table,
      title = __['global-billing-record'],
      detail = _config.table.detail;
    return (
      <div className="halo-module-global-billing-record" style={this.props.style}>
        <div className="tab-wrapper">
          <Tab items={tabs} />
        </div>
        <div className="btnlist">
          <div className="select">
            <select>
              <option key="name" value="name">{__.search_by_name}</option>
              <option key="id" value="id">{__.search_by_id}</option>
            </select>
            <input type="text"/>
          </div>
          <Button value={__.query} btnKey="normal" disabled={state.loading} onClick={this.onQuery} />
          <Button iconClass="download" btnKey="normal" value={__.export} initial={true} />
        </div>
        {
          !state.upLoading ? <div className="resource-list">
            <div className="left">
              <div className="title">{__.all_types}</div>
              <div className="price">¥123443434.3233</div>
            </div>
            <div className="right">
              <div className="resource-wrapper">
                <div className="resource">
                  <div className="title">
                    <i className="glyphicon icon-status-active"></i>
                    Instance
                  </div>
                  <div className="price">
                    ¥123443434
                  </div>
                </div>
              </div>
            </div>
          </div> : <div className="loading-wrapper"><i className="glyphicon icon-loading"></i></div>
        }
        <div className="table-box">
          {!table.loading && !table.data.length ?
            <div className="table-with-no-data">
              <Table
                column={table.column}
                data={[]}
                checkbox={table.checkbox} />
              <p>
                {__.there_is_no + title + __.full_stop}
              </p>
            </div>
          : <Table
              ref="table"
              column={table.column}
              data={table.data}
              dataKey={table.dataKey}
              loading={true}
              checkbox={table.checkbox}
              checkboxOnChange={this.onChangeTableCheckbox.bind(this)}
            />
          }
        </div>
        {detail ?
          <Detail
            ref="detail"
            tabs={detail.tabs}
            rows={this.stores.rows}
            onClickTabs={this.onClickDetailTabs.bind(this)}
            setRefreshBtnDisabled={this.setRefreshBtnDisabled.bind(this)} />
          : null
        }
      </div>
    );
  }
}

module.exports = Model;
