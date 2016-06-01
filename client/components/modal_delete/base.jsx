var React = require('react');
var {Modal, Button, Tip} = require('client/uskin/index');

class ModalBase extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      disabled: props.disabled,
      tip: props.tip,
      tipType: 'warning'
    };

    this.onDelete = this.onDelete.bind(this);
    this.onCancel = this.onCancel.bind(this);
  }

  onDelete() {
    this.setState({
      disabled: true
    });
    this.props.onDelete && this.props.onDelete(this.state, (status, msg) => {
      if (status) {
        this.setState({
          visible: false
        });
      } else {
        if (msg) {
          this.setState({
            tip: msg,
            tipType: 'danger'
          });
        }
        this.setState({
          disabled: false
        });
      }

    });
  }

  onCancel() {
    this.setState({
      visible: false
    });
    this.props.onCancel && this.props.onCancel();
  }

  render() {
    var props = this.props,
      state = this.state,
      __ = props.__,
      action = __[props.action],
      type = __[props.type],
      num = props.data.length,
      cancel = __.cancel,
      content = __.msg_delete.replace('{0}', action).replace('{1}', type).replace('{2}', num);

    var _props = Object.assign({}, props, {
      title: action + type
    });

    var iconType = props.iconType || props.type.replace('_', '-');

    return (
      <Modal {..._props} visible={state.visible}>
        <div className="modal-bd halo-com-modal-delete">
          <span dangerouslySetInnerHTML={{__html: content}}></span>
          <div className="data-list">
            {
              props.data.map((item) => {
                return <span key={item.id || item.name}><i className={'glyphicon icon-' + iconType}></i>{item.name || '(' + item.id.substr(0, 8) + ')'}</span>;
              })
            }
          </div>
          <div className={'modal-row tip-row' + (state.tip ? '' : ' hide')}>
            <Tip type={state.tipType} content={state.tip} showIcon={true} width={442}/>
          </div>
        </div>
        <div className="modal-ft">
          <Button value={action} disabled={state.disabled} btnKey="create" type="delete" onClick={this.onDelete}/>
          <Button value={cancel} btnKey="cancel" type="cancel" onClick={this.onCancel}/>
        </div>
      </Modal>
    );
  }
}

module.exports = ModalBase;
