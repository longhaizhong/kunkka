var commonModal = require('client/components/modal_common/index');
var config = require('./config.json');

function pop(obj, callback, parent) {

  config.fields[0].text = obj.name;
  config.fields[1].data = obj.volume;

  var props = {
    parent: parent,
    config: config,
    onInitialize: function(refs) {},
    onConfirm: function(refs, cb) {
      callback();
      cb(true);
    },
    onAction: function(field, state, refs) {

    },
    onLinkClick: function() {

    }
  };

  commonModal(props);
}

module.exports = pop;
