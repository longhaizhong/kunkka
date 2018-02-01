const commonModal = require('client/components/modal_common/index');
const config = require('./config.json');
// const request = require('../../request');
const __ = require('locale/client/bill.lang.json');

function pop(obj, parent, callback) {

  let props = {
    __: __,
    parent: parent,
    config: config,
    onInitialize: function(refs) {
    },
    onConfirm: function(refs, cb) {

    },
    onAction: function(field, state, refs) {
      switch(field) {
        default:
          break;
      }
    }
  };

  commonModal(props);
}

module.exports = pop;
