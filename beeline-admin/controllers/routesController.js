import querystring from 'querystring';

export default function($scope, $state, $urlRouter, AdminService, LoadingSpinner,
  RoutePopup, commonModals, RoutesService, $rootScope, $uibModal, TripsService,
  companyId) {

  $scope.pageProps = {
    companyId
  }

  $scope.selectedRoute = null;

  $scope.params = _.assign({}, $state.params);
  var myState = $state.current.name;

  const tagPresets = [
    { name: 'All', tags: null },
    { name: 'Crowdstart', tags: ['lelong'] },
    { name: 'Lite', tags: ['lite'] },
    { name: 'Regular', tags: ['public'] },
  ]

  $scope.data = [];
  $scope.filter = {
    perPage: 30,
    page: 1,
  	orderBy: 'label',
  	order: 'asc',
    preset: tagPresets[0],
  };
  $scope.now = Date.now();
  $scope.tagPresets = tagPresets;

  if (companyId)
    $scope.filter.transportCompanyId = companyId

  function refreshRoutes() {
    if (!$scope.filter.transportCompanyId) return;

    const options = _.assign(
      _.pick($scope.filter, ['perPage', 'page', 'orderBy', 'order']),
      {transportCompanyId: $scope.filter.transportCompanyId},
      $scope.filter.preset.tags ? {tags: JSON.stringify($scope.filter.preset.tags)} : {}
    )

    var promise = AdminService.beeline({
      method: 'GET',
      url: '/routes/report?' + querystring.stringify(options)
    })
    .then((response) => {
      for (let route of response.data.rows) {
        route.startDate = new Date(route.startDate);
        route.endDate = new Date(route.endDate);
      }
      $scope.data = response.data;
    })
    .then(null, (error) => {
      console.log(error)
    })

    LoadingSpinner.watchPromise(promise);
  }

  $scope.copy = async function(route) {
    // Pull the route from RoutesService to exclude all the extra fields
    route = await LoadingSpinner.watchPromise(RoutesService.getRoute(route.id))

    var newRoute = _.omit(route, ['id']);

    // Prompt for a new label
    newRoute.label = await commonModals.prompt({
      message: 'New route label',
      'default': newRoute.label
    })

    if (!newRoute.label) {return;}

    // Prompt for the dates
    var trips = await promptForTripsToCopy(route);

    var createdRoute = await RoutesService.saveRoute(newRoute);

    // Created the associated trips
    var tripPromises = trips.map((trip) => {
      trip.id = null;
      trip.routeId = createdRoute.id;
      for (let tripStop of trip.tripStops) {
        tripStop.id = null;
      }
      return TripsService.createTrips(
        [moment(trip.date).utcOffset(0)],
        trip
      )
    })
    await LoadingSpinner.watchPromise(Promise.all(tripPromises));

    refreshRoutes();
  }

  $scope.viewRoute = function (routeId) {
    RoutePopup.show({routeId});
  }

  $scope.$watch('filter', refreshRoutes, true)

  ///////// Additional helper functions

  async function promptForTripsToCopy(route) {
    var childScope = $rootScope.$new();

    childScope.route = route;
    childScope.data = {};

    var modal = $uibModal.open({
      controller: DatesController,
      keyboard: false,
      backdrop: 'static',
      template: require('../directives/tripsEditor/createTripsDateTemplate.html'),
      scope: childScope
    })

    try {
      var dates = await modal.result;
      var filteredTrips = childScope.data.trips.filter(
        (trip) => _.some(dates, d => d.valueOf() === trip.date.getTime())
      )

      return filteredTrips;
    } catch (err) {
      throw err;
    } finally {
      childScope.$destroy();
    }
  }
}

function DatesController($scope, TripsService) {
  var lastPromise = null;
  var now = new Date();

  $scope.datepicker = {
    highlightDays: [],
    daysAllowed: [],
    month: moment(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()), 'x'
    ).utcOffset(0)
  }

  $scope.monthChanged = function () {}

  function loadTrips(newMonth) {
    var promise = lastPromise = TripsService.getTrips({
      routeId: $scope.route.id,
      startDate: new Date(
        newMonth.year(),
        newMonth.month() - 2,
        1
      ),
      endDate: new Date(
        newMonth.year(),
        newMonth.month() + 2,
        1
      ),
    })
    .then((trips) => {
      if (promise !== lastPromise) return;
      $scope.data.trips = trips;
      $scope.datepicker.daysAllowed = trips.map(t => moment(t.date));
      // block out the days with trips
      $scope.datepicker.highlightDays = trips.map(
        trip => ({
          date: moment(trip.date),
          css: 'trip-exists',
          selectable: true,
        })
      )
    });
  }
  loadTrips(moment());
}
