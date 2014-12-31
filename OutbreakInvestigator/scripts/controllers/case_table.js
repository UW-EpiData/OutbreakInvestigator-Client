/***** Copyright 2014 University of Washington (Neil Abernethy, Wilson Lau, Todd Detwiler)***/
/***** http://faculty.washington.edu/neila/ ****/

angular.module('obiUiApp')
        .controller("CaseTableCtrl", function ($scope, $http, $timeout, graphService, displayService, eventService, timelineService) {
            $scope.uid;
            $scope.gridOptions = {
                enableRowSelection: true,
                enableSelectAll: true,
                enableRowHeaderSelection: true,
                selectionRowHeaderWidth: 35,
                useExternalSorting: false,
                enableGridMenu: true,
//                exporterLinkLabel: 'get your csv here',
                exporterPdfDefaultStyle: {fontSize: 8},
                exporterPdfTableStyle: {margin: [30, 30, 30, 30]},
                exporterPdfTableHeaderStyle: {fontSize: 10, bold: true, italics: true, color: 'red'},
                exporterPdfOrientation: 'landscape',
                exporterPdfPageSize: 'LETTER',
                exporterPdfMaxGridWidth: 500,
                exporterLinkTemplate: "<span class=\"ui-grid-exporter-csv-link-span\" ><a    download=\"OutbreakInvestigator.csv\" href=\"data:text/csv;charset=UTF-8,CSV_CONTENT\" target=\"_blank\" >LINK_LABEL</a></span>",
                exporterCsvLinkElement: angular.element(document.querySelectorAll(".custom-csv-link-location")),
                onRegisterApi: function (gridApi) {
                    $scope.gridApi = gridApi;
                    $scope.gridApi.selection.on.rowSelectionChanged($scope, $scope.rowSelectionChanged);
                    $scope.gridApi.core.on.sortChanged($scope, function (grid, sortCol) {
                        if ($scope.gridOptions.useExternalSorting)
                        {
                            $scope.gridOptions.data = grid.options.data;
                            grid.refresh();
                            $timeout(function () {
                                grid.resetColumnSorting();
                                $scope.gridOptions.useExternalSorting = false;
                            }, 100);
                        }

                    });
                }
            };


            $scope.rowSelectionChanged = function (row)
            {

                var selRows = $scope.gridApi.selection.getSelectedRows();
                if (eventService.getUIMode() == 'multiselect')
                {
                    if (selRows.length > 0)
                        eventService.setSelCases(selRows, row.uid);

                    else
                        eventService.setSelCases([], row.uid);
                }
                else if (eventService.getUIMode() == 'select')
                {
                    if (row.isSelected)
                        eventService.setSelCases([row.entity], row.uid);

                    else
                        eventService.setSelCases([], row.uid);
                }
            };

            $scope.gridOptions.columnDefs = displayService.getCaseInfoFieldsGrid();
            angular.forEach($scope.gridOptions.columnDefs, function (value, key) {
                if (value.type && value.type === 'date')
                {
                    value.sortingAlgorithm = function (a, b) {
                        var nulls = $scope.gridApi.core.sortHandleNulls(a, b);
                        if (nulls !== null) {
                            return nulls;
                        } else {
                            var aDT = new Date(a);
                            var bDT = new Date(b);
                            if (aDT < bDT)
                                return  -1;
                            if (aDT > bDT)
                                return  1;
                            else
                                return 0;
                        }
                    };
                }
                ;
            });

            // data
            $scope.cases = [];
            if (graphService.getGraph())
            {
                reloadGraph(graphService.getGraph());
                $timeout(function () {
                    var selCases = {};
                    selCases.nodes = eventService.getSelCases()
                    if (selCases.nodes && selCases.nodes.length > 0)
//                        reloadGraph(selCases);
                        $scope.selectRow();

                });
            }

            $scope.$watch(graphService.getGraph, function (newVal, oldVal)
            {
                var selCases = {};
                selCases.nodes = eventService.getSelCases();
                if (selCases.nodes && selCases.nodes.length > 0)
//                    reloadGraph(selCases);
                    $timeout(function() {$scope.selectRow();});
                else if (newVal !== oldVal)
                    reloadGraph(newVal);
                
            });

            $scope.resetUI = function ()
            {
                reloadGraph(graphService.getGraph());
                $scope.gridApi.selection.clearSelectedRows();
            };

            $scope.updateFilter = function ()
            {
                removeDownloadLink();
                var timeline = timelineService.getTimeline();
                if (timeline)
                {
                    var filters = timeline.filters()[0];
                    if (filters)
                    {
                        var filteredCase = {};
                        filteredCase.nodes = graphService.getGraph().nodes.filter(function (cif) {
                            return ((new Date(cif.REPORT_DT)).getTime() >= filters[0].getTime() &&
                                    (new Date(cif.REPORT_DT)).getTime() <= filters[1].getTime());
                        });
                        //angular.copy(filteredCase, $scope.gridOptions.data);
                         reloadGraph(filteredCase);
                        
                         $timeout(function() {$scope.selectRow();});
                    }
                }
               

            };

            $scope.selectRow = function ()
            {
                removeDownloadLink();

                $scope.gridApi.suppressEvents($scope.rowSelectionChanged, function () {
                    $scope.gridApi.selection.clearSelectedRows();
                });
                var selCases = {};
                selCases.nodes = eventService.getSelCases();
                selectGraph(selCases.nodes );
//                if (selCases.nodes && selCases.nodes.length > 0)
//                    reloadGraph(selCases);
//                else
//                {
//                    reloadGraph(graphService.getGraph());
//                }

            };

            $scope.sortSelected = function (data)
            {
                $scope.gridOptions.data = data;
            };

            function removeDownloadLink()
            {
                // remove download link if any
                var targetElm = $scope.gridOptions.exporterCsvLinkElement;
                if ((targetElm[0]) && (angular.element(targetElm[0].querySelectorAll('.ui-grid-exporter-csv-link-span')))) {
                    angular.element(targetElm[0].querySelectorAll('.ui-grid-exporter-csv-link-span')).remove();
                }
            }
            
            function selectGraph(graphdata)
            {
                    angular.forEach(graphdata, function (data, gindex) {

                        for (var i = 0; i < $scope.gridOptions.data.length; i++) {
                            if ($scope.gridOptions.data[i].dbid === data.dbid) {

                                if ($scope.gridApi != undefined)
                                    $scope.gridApi.suppressEvents($scope.rowSelectionChanged, function () {
                                        $scope.gridApi.selection.selectRow($scope.gridOptions.data[i]);
                                    });

                            }
                        }
                        ;

                    });
            }
            

            function reloadGraph(newGraph)
            {
                var graph_data = {};
                angular.copy(newGraph, graph_data);

//                var timeline = timelineService.getTimeline();
//                if (timeline)
//                {
//                    var filters = timeline.filters()[0];
//                    if (filters)
//                    {
//                        var filteredCase = {};
//                        filteredCase.nodes = graph_data.nodes.filter(function (cif) {
//                            return ((new Date(cif.REPORT_DT)).getTime() >= filters[0].getTime() &&
//                                    (new Date(cif.REPORT_DT)).getTime() <= filters[1].getTime());
//                        });
//                        angular.copy(filteredCase, graph_data);
//                    }
//                }
                $scope.cases = graph_data.nodes;
//                if (($scope.gridOptions.data == undefined)) 
                {
                    $scope.gridOptions.data = graph_data.nodes;
                }
//                else if ((graph_data.nodes.length) < ($scope.gridOptions.data.length))
//                if (eventService.getSelCases().length < graph_data.nodes.length)
//                {
//                    angular.forEach(graph_data.nodes, function (graphdata, gindex) {
//
//                        for (var i = 0; i < $scope.gridOptions.data.length; i++) {
//                            if ($scope.gridOptions.data[i].dbid === graphdata.dbid) {
//
//                                if ($scope.gridApi != undefined)
//                                    $scope.gridApi.suppressEvents($scope.rowSelectionChanged, function () {
//                                        $scope.gridApi.selection.selectRow($scope.gridOptions.data[i]);
//                                    });
//
//                            }
//                        }
//                        ;
//
//                    });
//                }
            }

        }
        )
        .directive('casetableVis', function ($window, $document, graphService, eventService, displayService) {
            return {
                restrict: 'A',
                link: function (scope, elem, attrs) {
                    var uid = elem.uniqueId();
                    scope.$on('selCasesUpdate', function (evt, selCases, requestModuleID)
                    {
                        if (requestModuleID !== uid)
                        {
                            scope.$evalAsync(attrs.select);
                        }
                    });

                    scope.$on('rightFilterUpdate', function (evt, filter) {
                        scope.$evalAsync(attrs.updatefilter);
                    });

                    scope.$on('resetUI', function (evt, filter) {
                        scope.$evalAsync(attrs.resetui);
                    });


                }
            };
        })

        .directive('uiGridSelectionSelectAllButtons', ['uiGridSelectionService',
            function (uiGridSelectionService) {
                return {
                    replace: true,
                    restrict: 'E',
                    priority: 100,
                    //     template: $templateCache.get('ui-grid/selectionSelectAllButtons'),
                    //template :  "<div class=\"ui-grid-selection-row-header-buttons ui-grid-icon-ok\" ng-class=\"{'ui-grid-all-selected': grid.selection.selectAll}\" ng-click=\"headerButtonClick2($event)\">&nbsp;</div>",

                    scope: true,
                    link: function ($scope, $elm, $attrs, uiGridCtrl) {
                        var self = $scope.col.grid;

                        $scope.headerButtonClick = function (row, evt) {
                            var selectedRows = uiGridSelectionService.getSelectedRows(self);
                            if (selectedRows.length > 0) {
//                                $scope.$evalAsync(function (self) {
                                self.options.data.sort(function (a, b) {
                                    var filteredCaseA = selectedRows.filter(function (cif) {

                                        return (cif.entity.dbid === a.dbid);
                                    });
                                    var filteredCaseB = selectedRows.filter(function (cif) {
                                        return (cif.entity.dbid === b.dbid);
                                    });
                                    if ((filteredCaseA.length > 0) && (a.dbid > b.dbid))
                                        return b.dbid - a.dbid;
                                    else if ((filteredCaseB.length > 0) && (a.dbid < b.dbid))
                                        return b.dbid - a.dbid;
                                    else
                                        return    a.dbid - b.dbid;
                                });
                            }
//                                )
                            self.resetColumnSorting();
                            self.options.useExternalSorting = true;
                            self.api.core.raise.sortChanged(self, self.getColumnSorting());

                        };
                    }
                };
            }]);




