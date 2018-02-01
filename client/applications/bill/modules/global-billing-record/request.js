const fetch = require('../../cores/fetch');

module.exports = {
  getList: function() {
    let url = '/proxy-shadowfiend/v1/orders/resource_consumption?resource_type=compute&all_get=True';
    return fetch.get({
      url: url
    });
  },
  getResourceList: function() {
    let url = '/proxy-shadowfiend/v1/orders/total_consumption?project_id=' + HALO.user.projectId + '&all_get=True';
    return fetch.get({
      url: url
    });
  }
};
