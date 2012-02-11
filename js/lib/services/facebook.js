var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

define(['mediator', 'lib/utils', 'lib/services/service_provider'], function(mediator, utils, ServiceProvider) {
  'use strict';
  var Facebook;
  return Facebook = (function(_super) {
    var facebookAppId, scope;

    __extends(Facebook, _super);

    facebookAppId = '215662575119216';

    scope = 'user_likes';

    Facebook.prototype.name = 'facebook';

    Facebook.prototype.status = null;

    Facebook.prototype.accessToken = null;

    function Facebook() {
      this.processUserData = __bind(this.processUserData, this);
      this.processComment = __bind(this.processComment, this);
      this.processLike = __bind(this.processLike, this);
      this.facebookLogout = __bind(this.facebookLogout, this);
      this.publishAbortionResult = __bind(this.publishAbortionResult, this);
      this.loginHandler = __bind(this.loginHandler, this);
      this.triggerLogin = __bind(this.triggerLogin, this);
      this.loginStatusHandler = __bind(this.loginStatusHandler, this);
      this.getLoginStatus = __bind(this.getLoginStatus, this);
      this.saveAuthResponse = __bind(this.saveAuthResponse, this);
      this.sdkLoadHandler = __bind(this.sdkLoadHandler, this);      Facebook.__super__.constructor.apply(this, arguments);
      utils.deferMethods({
        deferred: this,
        methods: ['parse', 'subscribe', 'postToGraph', 'getAccumulatedInfo', 'getInfo'],
        onDeferral: this.loadSDK
      });
      utils.wrapAccumulators(this, ['getAccumulatedInfo']);
      this.subscribeEvent('loginAbort', this.loginAbort);
      this.subscribeEvent('logout', this.logout);
    }

    Facebook.prototype.dispose = function() {};

    Facebook.prototype.loadSDK = function() {
      if (this.state() === 'resolved' || this.loading) return;
      this.loading = true;
      window.fbAsyncInit = this.sdkLoadHandler;
      return utils.loadLib('http://connect.facebook.net/en_US/all.js', null, this.reject);
    };

    Facebook.prototype.sdkLoadHandler = function() {
      this.loading = false;
      try {
        delete window.fbAsyncInit;
      } catch (error) {
        window.fbAsyncInit = void 0;
      }
      FB.init({
        appId: facebookAppId,
        status: true,
        cookie: true,
        xfbml: false
      });
      this.registerHandlers();
      return this.resolve();
    };

    Facebook.prototype.registerHandlers = function() {
      this.subscribe('auth.logout', this.facebookLogout);
      this.subscribe('edge.create', this.processLike);
      return this.subscribe('comment.create', this.processComment);
    };

    Facebook.prototype.isLoaded = function() {
      return Boolean(window.FB && FB.login);
    };

    Facebook.prototype.saveAuthResponse = function(response) {
      var authResponse;
      this.status = response.status;
      authResponse = response.authResponse;
      if (authResponse) {
        return this.accessToken = authResponse.accessToken;
      } else {
        return this.accessToken = null;
      }
    };

    Facebook.prototype.getLoginStatus = function(callback, force) {
      if (callback == null) callback = this.loginStatusHandler;
      if (force == null) force = false;
      return FB.getLoginStatus(callback, force);
    };

    Facebook.prototype.loginStatusHandler = function(response) {
      var authResponse;
      this.saveAuthResponse(response);
      authResponse = response.authResponse;
      if (authResponse) {
        this.publishSession(authResponse);
        return this.getUserData();
      } else {
        return mediator.publish('logout');
      }
    };

    Facebook.prototype.triggerLogin = function(loginContext) {
      return FB.login(_(this.loginHandler).bind(this, loginContext), {
        scope: scope
      });
    };

    Facebook.prototype.loginHandler = function(loginContext, response) {
      var authResponse;
      this.saveAuthResponse(response);
      authResponse = response.authResponse;
      if (authResponse) {
        mediator.publish('loginSuccessful', {
          provider: this,
          loginContext: loginContext
        });
        this.publishSession(authResponse);
        return this.getUserData();
      } else {
        mediator.publish('loginAbort', {
          provider: this,
          loginContext: loginContext
        });
        return this.getLoginStatus(this.publishAbortionResult, true);
      }
    };

    Facebook.prototype.publishSession = function(authResponse) {
      return mediator.publish('serviceProviderSession', {
        provider: this,
        userId: authResponse.userID,
        accessToken: authResponse.accessToken
      });
    };

    Facebook.prototype.publishAbortionResult = function(response) {
      var authResponse;
      this.saveAuthResponse(response);
      authResponse = response.authResponse;
      if (authResponse) {
        mediator.publish('loginSuccessful', {
          provider: this,
          loginContext: loginContext
        });
        mediator.publish('loginSuccessfulThoughAborted', {
          provider: this,
          loginContext: loginContext
        });
        return this.publishSession(authResponse);
      } else {
        return mediator.publish('loginFail', {
          provider: this,
          loginContext: loginContext
        });
      }
    };

    Facebook.prototype.facebookLogout = function(response) {
      return this.saveAuthResponse(response);
    };

    Facebook.prototype.logout = function() {
      return this.status = this.accessToken = null;
    };

    Facebook.prototype.processLike = function(url) {
      return mediator.publish('facebookLike', url);
    };

    Facebook.prototype.processComment = function(comment) {
      return mediator.publish('facebookComment', comment.href);
    };

    Facebook.prototype.parse = function(el) {
      return FB.XFBML.parse(el);
    };

    Facebook.prototype.subscribe = function(eventType, handler) {
      return FB.Event.subscribe(eventType, handler);
    };

    Facebook.prototype.unsubscribe = function(eventType, handler) {
      return FB.Event.unsubscribe(eventType, handler);
    };

    Facebook.prototype.postToGraph = function(ogResource, data, callback) {
      return FB.api(ogResource, 'post', data, function(response) {
        if (callback) return callback(response);
      });
    };

    Facebook.prototype.postToStream = function(data, callback) {
      return this.postToGraph('/me/feed', data, callback);
    };

    Facebook.prototype.getAccumulatedInfo = function(urls, callback) {
      if (typeof urls === 'string') urls = [urls];
      urls = _(urls).reduce(function(memo, url) {
        if (memo) memo += ',';
        return memo += encodeURIComponent(url);
      }, '');
      return FB.api("?ids=" + urls, callback);
    };

    Facebook.prototype.getInfo = function(id, callback) {
      return FB.api(id, callback);
    };

    Facebook.prototype.getUserData = function() {
      return this.getInfo('/me', this.processUserData);
    };

    Facebook.prototype.processUserData = function(response) {
      return mediator.publish('userData', response);
    };

    return Facebook;

  })(ServiceProvider);
});
