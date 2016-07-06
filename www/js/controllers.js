(function() {
  angular.module('cinetic.controllers', [])
  .filter('rating', function($sce) {
    return function(input) {
      var rating = parseFloat(input);
      var ratingInt = Math.floor(rating);
      var html = '';
      for (var i = 0; i < ratingInt; ++i)
        html += '<i class="icon ion-ios-star"></i>';
      if (ratingInt != rating)
        html += '<i class="icon ion-ios-star-half"></i>';
      else
        html += '<i class="icon ion-ios-star-outline"></i>';
      for (var i = ratingInt + 1; i < 10; ++i)
        html += '<i class="icon ion-ios-star-outline"></i>';
      return $sce.trustAsHtml(html);
    }
  })
    // search controller, handles everything related to searching the movies the user asks for through the input
    .controller('searchCtrl', function($scope, $q, $http, $state, $ionicScrollDelegate, $ionicSideMenuDelegate, $ionicLoading, $timeout, omdbFactory, constantsFactory) {
      // two-way binding for the search strings provided in the search input
      $scope.SearchData = {};
      // function to scroll to the top of the viewport
      $scope.scrollTop = function() {
        $ionicScrollDelegate.scrollTop(true);
      };
      // returns a random object or array element from a given object/array/list
      $scope.getRandomObj = function(obj) {
        return obj[Math.floor(Math.random() * obj.length)];
      }
        // dump search result list
        $scope.clearSearch = function() {
          delete $scope.movies;
        }
        // dump search result query
        $scope.clearQuery = function() {
        //console.log("Attempting to clear search query.");
        delete $scope.SearchData.title;
      }

      // main function to return a list of films using the omdbservice factory
      $scope.getMovies = function(SearchData) {
        // remove focus from the input field
        document.getElementById('movie-title').blur();
        // add random color & spinner to $scope
        $scope.spin = $scope.getRandomObj(constantsFactory.spinnerItems());
        $scope.color = $scope.getRandomObj(constantsFactory.spinnerColors());
        //$scope.combine = $scope.spin.concat($scope.color); 
        // show a loading screen while the async call to the api is happening
        $ionicLoading.show({
          template: 'Loading data...</br></br> <ion-spinner class="spinner-' + $scope.color + '" icon=' + $scope.spin + '></ion-spinner>',
            // if you want to debug the loading screen
            //duration: 5000
          })
          // debug search query
          //console.log(SearchData.title);
          if (SearchData.title === undefined) {
            $ionicLoading.hide();
            constantsFactory.throwWarning("empty");
            return;
          }
        // put the factory search function in a variable it will return a $q promise, then wait for a response
        var promise = omdbFactory.search(SearchData);
        promise.then(function(results) {
          // hide the loading screen if promise is kept
          $ionicLoading.hide();
          // debug payload from ajax call
          console.log(results);

          // payload response returns 3 properties, Results, Search and totalResults. Results is a boolean.
          if (results.Response === "True") {
            // if we get a positive response, clear the search query as it is no longer needed
            $scope.clearQuery();
            // dump the results payload to a $scope variable so the view can use the data
            $scope.movies = results.Search;
            // debug the scope
            //console.log($scope.movies);
            return;
          }
          // if results.Response returned false, alert the user that the search query failed
          constantsFactory.throwWarning("failed");
        });
      }
    })

  // about controller, can be used to handle anything in the about page
  .controller('homeCtrl', ['$scope', '$state', '$ionicPopup', '$ionicSideMenuDelegate', '$ionicLoading', '$ionicHistory', '$rootScope', 'constantsFactory',
    function($scope, $state, $ionicPopup, $ionicSideMenuDelegate, $ionicLoading, $ionicHistory, $rootScope, constantsFactory) {
      /*
      function onPageWillEnter() 
      {
        document.getElementsByTagName("ion-nav-bar")[0].style.display = "none";
      }
      onPageWillEnter();
      */

      //TODO: Change this to reflect the other views
      $ionicSideMenuDelegate.canDragContent(false)
      $scope.authType = false;
      $scope.loginClass = "animate";
      $scope.signupClass = "";
      $scope.authT = function(val)
      {
        //console.log("Auth was " + $scope.authType)
        $scope.authType = !$scope.authType;
        //console.log("Auth now is " + $scope.authType)
      }
      var authProvider = 'basic';
      var authSettings = { 'remember': true };
      $scope.loginDetails = {};
      $scope.signupDetails = {};

      $scope.signUp = function(data)
      {
        console.log(data);
        Ionic.Auth.signup(data).then($scope.signupSuccess, $scope.signupFailure);
      }

      $scope.login = function(loginDetails) {
        Ionic.Auth.login(authProvider, authSettings, loginDetails)
        .then($scope.authSuccess, $scope.authFailure);
      };

      $scope.logout = function(loginDetails) {
        console.log("Logging out!");
        Ionic.Auth.logout();
        $scope.delegateToPage('home');
      };


      $scope.signupSuccess = function()
      {
        constantsFactory.throwWarning('SignUp');
        console.log("Successful sign up!");
      }

      $scope.signupFailure = function(err)
      {
        //console.log("Err count %o", err.errors[0])
        for(var i=0; i < err.errors.length; i++)
        {
          alert("Sign up errors are: " + err.errors[i])
          console.log(err.errors[i])
        }
      }

      $scope.authSuccess = function() {
       // replace dash with the name of your main state
       console.log("Delegating to Search Page!");
       $rootScope.showSideMenu = true;
       $scope.delegateToPage('search');
     } 

     $scope.authFailure = function(errors) {
      var fullErr = '';
      //console.dir(errors.response);
      var obj = JSON.parse(errors.response.response);
      //console.log(obj.error.message);
      for (var i=0; i < obj.error.details.length; i++) 
      {
        //console.log(obj.error.details[i]);
        fullErr += obj.error.details[i].error_type + " " + obj.error.details[i].parameter + " ";
      }
      console.log(fullErr);
    };

    $scope.delegateToPage = function(stateName) {
      $ionicHistory.nextViewOptions({disableBack: true,historyRoot: true});
      $state.go(stateName, {}, {location: 'replace'});
    }
  }
  ])

  // watchlist controller, handles movies or shows saved by the user
  .controller('watchlistCtrl', ['$scope', '$state', '$ionicHistory', '$ionicPopup', '$ionicSideMenuDelegate', '$ionicLoading', '$ionicActionSheet', 'omdbFactory', 'constantsFactory',
    function($scope, $state, $ionicHistory, $ionicPopup, $ionicSideMenuDelegate, $ionicLoading, $ionicActionSheet, omdbFactory, constantsFactory) {

      $scope.blurred = "";
      $scope.toggleClass = function(movie) {
        if ($scope.blurred === "") {
          $scope.blurred = "blur-background";
        } else {
          $scope.blurred = "";
        }
        var popupTemplate = constantsFactory.popTemplate(movie);

        var alertPopup = $ionicPopup.alert({
          title: movie.Title + ' (' + movie.Year + ')',
          template: popupTemplate,
          buttons: [{
            text: 'Okay',
            type: 'button-calm',
            onTap: function() {
              $scope.blurred = "";
            }
          }],
          cssClass: 'forceTouch'
        });
      }

      $scope.show = function(movie) {
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
          buttons: [{
            text: '<i class="icon ion-checkmark-circled balanced"></i> Seen'
          }, {
            text: '<i class="icon ion-android-open positive"></i> View on IMDb'
          }, {
            text: '<i class="icon ion-minus-circled assertive"></i> Dismiss'
          }],
          titleText: '<h4 class="subdued">' + movie.Title + " " + '(' + movie.Year + ')' + '</h4>',
          cancelText: 'Cancel',
          cancel: function() {
            hideSheet();
          },
          buttonClicked: function(index) {
            if (index == 0) {} else if (index == 1) {
              window.open('http://www.imdb.com/title/' + movie.imdbID + '/', '_system', 'location=yes');
            } else if (index == 2) {
              omdbFactory.deleteAPI("Haylo", movie.imdbID);
              //console.log($scope.Watchlist.length);
              $scope.searchAPI();
              $state.go($state.current, {}, {reload: true});
            }
            return true;
          }
        });
      };

      $scope.delegateToSearch = function() {
        $ionicHistory.nextViewOptions({
          disableBack: true,
          historyRoot: true
        });
        $state.go('search', {}, {
          location: 'replace'
        });
      }

      $scope.searchAPI = function() {
        $ionicLoading.show({
          template: "Loading data...</br> <ion-spinner icon='ripple'></ion-spinner>"
            //debug loader
            //duration:5000
          })

        var promise = omdbFactory.searchAPI();

        promise.then(function(payload) 
        {
          $scope.notFound = true;
          if (payload != -1 && payload[0].Search.length) {
            $ionicLoading.hide();
            // debug ajax payload
            //console.log(payload);
            $scope.Watchlist = payload[0].Search;
            //console.log("The current scope is %O", $scope.Watchlist)
            $scope.notFound = false;
            return;
          }
          $scope.notFound = true;
          $ionicLoading.hide();
        })
      }
      $scope.searchAPI();
    }
    ])

  // details controller, handles what happens when we click on a list item generated from the search controller view, takes up an ID state parameter
  .controller('detailsCtrl', function($scope, $state, $stateParams, $ionicPopup, $ionicSideMenuDelegate, $ionicLoading, omdbFactory, constantsFactory) {
    // prompt a loading screen to the user until the http call fetches the data via id
    $ionicLoading.show({
      template: "Loading data...</br> <ion-spinner icon='ripple'></ion-spinner>"
          //debug loader
          //duration:5000
        })
      // has the same functionality as the search controller's search method, except this one takes works on the details page and 
      // sends a $stateParam with the movie ID fetched from the search list
      var promise = omdbFactory.search($stateParams);
      promise.then(function(payload) {
        if (payload.Response === "True") {
          $ionicLoading.hide();
        //Runtime is returned as full minutes, we need to convert it to hours and the remainder as minutes
        payload.Hours = Math.floor(parseInt(payload.Runtime) / 60);
        payload.Minutes = (parseInt(payload.Runtime) % 60);
        // debug ajax payload
        //console.log(payload);
        $scope.mDtl = payload;
        return;
      }
      $ionicLoading.hide();
      constantsFactory.throwWarning("failedDetails");
      // if the payload returned False, go back to the search state as the Details view will be empty 
      $state.go("search");
    });

      $scope.sendData = function(movieObject) {
        $scope.data = {};
        $scope.data.userId = "Haylo";
        $scope.data.Search = movieObject;

        console.log($scope.data);

      //console.log(data);

      $ionicLoading.show({
        template: "Loading data...</br> <ion-spinner icon='ripple'></ion-spinner>"
          //debug loader
          //duration:5000
        })
      var promise = omdbFactory.postAPI($scope.data);
      promise.then(function(payload) {

        if (payload != -1) {
          $ionicLoading.hide();
          //console.log('Successfully saved movie');
          constantsFactory.throwWarning("movieAdded");
          return;
        }

        $ionicLoading.hide();
        constantsFactory.throwWarning("movieFailedAdd");
      })
    }
  });
}());
