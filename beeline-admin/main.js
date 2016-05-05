
require('beeline-calendar')

// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('beeline-admin', [
  'uiGmapgoogle-maps', 'ui.router', 'ui.bootstrap', 'beeline.calendar'])
.config(require('./router').default)
.config(configureGoogleMaps)
.directive('adminNav', require('./directives/adminNav/adminNav').default)
.directive('accountView', require('./directives/accountView/accountView').default)
.directive('paymentView', require('./directives/paymentView/paymentView').default)
.directive('ticketView', require('./directives/ticketView/ticketView').default)
.directive('routeSelector', require('./directives/routeSelector/routeSelector').default)
.directive('routeEditor', require('./directives/routeEditor/routeEditor').default)
.directive('pathEditor', require('./directives/pathEditor/pathEditor').default)
.directive('tripsEditor', require('./directives/tripsEditor/tripsEditor').default)
.service('AdminService', require('./services/adminService').default)
.service('RoutesService', require('./services/routesService').default)
.controller('transactions', require('./controllers/transactionsController.js').default)
.controller('routes', require('./controllers/routesController.js').default)
.filter('makeRoutePath', require('./shared/filters.js').makeRoutePath)
.filter('makeRange', require('./shared/filters.js').makeRange)
.filter('hasStop', require('./shared/filters.js').hasStop)


function configureGoogleMaps(uiGmapGoogleMapApiProvider) {
  uiGmapGoogleMapApiProvider.configure({
    key: 'AIzaSyBkFH42PlbFrsfdAnjw37qMLAxjhkMT-54'
  })
}
