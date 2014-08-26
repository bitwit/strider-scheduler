var app = window.app
    , hourly = 1000 * 60 * 60
    , daily = hourly * 24;

/*
 * $scope.configs, $scope.branch and $scope.pluginConfig, among others are available from the parent scope
 * */
app.controller('SchedulerCtrl', ['$scope', function ($scope) {
    $scope.times = {
        hourly: hourly,
        daily: daily
    };

    $scope.frequencyOptions = [
        {key: "On new changes", value: 0},
        {key: "Hourly", value: hourly},
        {key: "Daily", value: daily}
    ];

    $scope.dayOptions = [
        {key: "Sunday", value: 0},
        {key: "Monday", value: 1},
        {key: "Tuesday", value: 2},
        {key: "Wednesday", value: 3},
        {key: "Thursday", value: 4},
        {key: "Friday", value: 5},
        {key: "Saturday", value: 6}
    ];

    $scope.hstep = 1;
    $scope.mstep = 5;
    $scope.saving = false;

    $scope.changed = function () {
        console.log('Time changed to: ' + $scope.config.time);
    };

    $scope.toggleDaySelection = function (day) {
        for (var i = 0; i < $scope.config.daySelection.length; i++) {
            var obj = $scope.config.daySelection[i];
            if (day.value === obj.value) {
                $scope.config.daySelection.splice(i, 1);
                return;
            }
        }
        $scope.config.daySelection.push(day);
    };

    $scope.isDaySelected = function (day) {
        for (var i = 0; i < $scope.config.daySelection.length; i++) {
            var obj = $scope.config.daySelection[i];
            if (day.value === obj.value) {
                return true;
            }
        }
    };

    $scope.$watch('configs[branch.name].scheduler.config', function (value) {
        $scope.config = value || {
            frequency: 0,
            time: new Date(),
            day: "Monday",
            lastJob: null,
            daySelection: angular.copy($scope.dayOptions)
        };
    });

    $scope.save = function () {
        $scope.saving = true;
        console.log('saving config', $scope.config);
        $scope.pluginConfig('scheduler', $scope.config, function () {
            $scope.saving = false;
        });
    };

}])

    .run(['$templateCache', function ($templateCache) {
        $templateCache.put(
            "template/timepicker/timepicker.html",
                "<div>\n" +
                "<div class=\"picker-row\">\n" +
                "<a ng-click=\"incrementHours()\" class=\"btn hours btn-link\"><i class=\"fa fa-chevron-up\"></i></a>" +
                "<span class=\"separator\">&nbsp;</span>" +
                "<a ng-click=\"incrementMinutes()\" class=\"btn btn-link\"><i class=\"fa fa-chevron-up\"></i></a>" +
                "</div>\n" +

                "<div class=\"picker-row\">\n" +
                "<input type=\"text\" ng-model=\"hours\" ng-change=\"updateHours()\" class=\"hours-control\" ng-mousewheel=\"incrementHours()\" ng-readonly=\"readonlyInput\" maxlength=\"2\">\n" +
                "<span class=\"separator\">:</span>\n" +
                "<input type=\"text\" ng-model=\"minutes\" ng-change=\"updateMinutes()\" class=\"minutes-control\" ng-readonly=\"readonlyInput\" maxlength=\"2\">\n" +
                "<span class=\"meridian\" ng-show=\"showMeridian\">" +
                "<button type=\"button\" class=\"btn btn-default text-center\" ng-click=\"toggleMeridian()\">{{meridian}}</button>" +
                "</span>\n" +
                "</div>\n" +

                "<div class=\"picker-row\">\n" +
                "<a ng-click=\"decrementHours()\" class=\"btn hours btn-link\"><i class=\"fa fa-chevron-down\"></i></a>" +
                "<span class=\"separator\">&nbsp;</span>" +
                "<a ng-click=\"decrementMinutes()\" class=\"btn btn-link\"><i class=\"fa fa-chevron-down\"></i></a>" +
                "</div>\n" +
                "</div>");
    }]);