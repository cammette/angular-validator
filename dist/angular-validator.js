(function() {
  var $, a, validator;

  $ = angular.element;

  a = angular.module('validator.directive', ['validator.provider']);

  validator = function($injector) {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, element, attrs) {
        var $parse, $validator, isAcceptTheBroadcast, match, model, name, rule, ruleNames, rules, validate, _i, _len;
        $validator = $injector.get('$validator');
        $parse = $injector.get('$parse');
        model = $parse(attrs.ngModel);
        rules = [];
        validate = function(from, funcs) {
          var rule, successCount, _i, _len, _results;
          successCount = 0;
          _results = [];
          for (_i = 0, _len = rules.length; _i < _len; _i++) {
            rule = rules[_i];
            switch (from) {
              case 'blur':
                if (rule.invoke !== 'blur') {
                  continue;
                }
                rule.enableError = true;
                break;
              case 'watch':
                if (rule.invoke !== 'watch' && !rule.enableError) {
                  continue;
                }
                break;
              case 'broadcast':
                rule.enableError = true;
            }
            model.assign(scope, rule.filter(model(scope)));
            _results.push(rule.validator(model(scope), scope, element, attrs, {
              success: function() {
                if (++successCount === rules.length) {
                  rule.success(scope, element, attrs);
                  return funcs != null ? funcs.success() : void 0;
                }
              },
              error: function() {
                if (rule.enableError) {
                  rule.error(scope, element, attrs);
                }
                if ((funcs != null ? funcs.error() : void 0) === 1) {
                  if (window.jQuery) {
                    return jQuery('html, body').animate({
                      scrollTop: jQuery(element).offset().top - 100
                    }, 500);
                  } else {
                    return element[0].scrollIntoViewIfNeeded();
                  }
                }
              }
            }));
          }
          return _results;
        };
        match = attrs.validator.match(/^\/(.*)\/$/);
        if (match) {
          rule = $validator.convertRule('dynamic', {
            validator: RegExp(match[1]),
            invoke: attrs.validatorInvoke,
            error: attrs.validatorError
          });
          rules.push(rule);
        }
        match = attrs.validator.match(/^\[(.*)\]$/);
        if (match) {
          ruleNames = match[1].split(',');
          for (_i = 0, _len = ruleNames.length; _i < _len; _i++) {
            name = ruleNames[_i];
            rule = $validator.getRule(name.replace(/^\s+|\s+$/g, ''));
            if (rule) {
              rules.push(rule);
            }
          }
        }
        isAcceptTheBroadcast = function(broadcast, modelName) {
          var item, repeat;
          if (modelName) {
            if (broadcast.targetScope === scope) {
              return attrs.ngModel.indexOf(modelName) === 0;
            } else {
              item = $(element);
              while (item.length !== 0) {
                repeat = item.attr('ng-repeat');
                match = repeat != null ? repeat.match(/^.* in (.*)$/) : void 0;
                if (match && match[1].indexOf(modelName) >= 0) {
                  return true;
                }
                item = item.parent();
              }
              return false;
            }
          }
          return true;
        };
        scope.$on($validator.broadcastChannel.prepare, function(self, object) {
          if (!isAcceptTheBroadcast(self, object.model)) {
            return;
          }
          return object.accept();
        });
        scope.$on($validator.broadcastChannel.start, function(self, object) {
          if (!isAcceptTheBroadcast(self, object.model)) {
            return;
          }
          return validate('broadcast', {
            success: object.success,
            error: object.error
          });
        });
        scope.$on($validator.broadcastChannel.reset, function(self, object) {
          var _j, _len1, _results;
          if (!isAcceptTheBroadcast(self, object.model)) {
            return;
          }
          _results = [];
          for (_j = 0, _len1 = rules.length; _j < _len1; _j++) {
            rule = rules[_j];
            _results.push(rule.success(scope, element, attrs));
          }
          return _results;
        });
        scope.$watch(attrs.ngModel, function(newValue, oldValue) {
          if (newValue === oldValue) {
            return;
          }
          return validate('watch');
        });
        return $(element).bind('blur', function() {
          return scope.$apply(function() {
            return validate('blur');
          });
        });
      }
    };
  };

  validator.$inject = ['$injector'];

  a.directive('validator', validator);

}).call(this);

(function() {
  angular.module('validator', ['validator.provider', 'validator.directive']);

}).call(this);

(function() {
  var $, a;

  $ = angular.element;

  a = angular.module('validator.provider', []);

  a.provider('$validator', function() {
    var $injector, $q, $timeout,
      _this = this;
    $injector = null;
    $q = null;
    $timeout = null;
    this.rules = {};
    this.broadcastChannel = {
      prepare: '$validatePrepare',
      start: '$validateStart',
      reset: '$validateReset'
    };
    this.setupProviders = function(injector) {
      $injector = injector;
      $q = $injector.get('$q');
      return $timeout = $injector.get('$timeout');
    };
    this.convertError = function(error) {
      /*
      Convert rule.error.
      @param error: error messate (string) or function(scope, element, attrs)
      @return: function(scope, element, attrs)
      */

      var errorMessage;
      if (typeof error === 'function') {
        return error;
      }
      errorMessage = error.constructor === String ? error : '';
      return function(scope, element, attrs) {
        var $label, label, parent, _i, _len, _ref, _results;
        parent = $(element).parent();
        _results = [];
        while (parent.length !== 0) {
          if (parent.hasClass('form-group')) {
            parent.addClass('has-error');
            _ref = parent.find('label');
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              label = _ref[_i];
              if ($(label).hasClass('error')) {
                $(label).remove();
              }
            }
            $label = $("<label class='control-label error'>" + errorMessage + "</label>");
            if (attrs.id) {
              $label.attr('for', attrs.id);
            }
            $(element).parent().append($label);
            break;
          }
          _results.push(parent = parent.parent());
        }
        return _results;
      };
    };
    this.convertSuccess = function(success) {
      /*
      Convert rule.success.
      @param success: function(scope, element, attrs)
      @return: function(scope, element, attrs)
      */

      if (typeof success === 'function') {
        return success;
      }
      return function(scope, element) {
        var label, parent, _i, _len, _ref, _results;
        parent = $(element).parent();
        _results = [];
        while (parent.length !== 0) {
          if (parent.hasClass('has-error')) {
            parent.removeClass('has-error');
            _ref = parent.find('label');
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              label = _ref[_i];
              if ($(label).hasClass('error')) {
                $(label).remove();
              }
            }
            break;
          }
          _results.push(parent = parent.parent());
        }
        return _results;
      };
    };
    this.convertValidator = function(validator) {
      /*
      Convert rule.validator.
      @param validator: RegExp() or function(value, scope, element, attrs, $injector)
                                                  { return true / false }
      @return: function(value, scope, element, attrs, funcs{success, error})
          (funcs is callback functions)
      */

      var func, regex, result;
      result = function() {};
      if (validator.constructor === RegExp) {
        regex = validator;
        result = function(value, scope, element, attrs, funcs) {
          if (regex.test(value)) {
            return typeof funcs.success === "function" ? funcs.success() : void 0;
          } else {
            return typeof funcs.error === "function" ? funcs.error() : void 0;
          }
        };
      } else if (typeof validator === 'function') {
        func = validator;
        result = function(value, scope, element, attrs, funcs) {
          return $q.all([func(value, scope, element, attrs, $injector)]).then(function(objects) {
            if (objects && objects.length > 0 && objects[0]) {
              return typeof funcs.success === "function" ? funcs.success() : void 0;
            } else {
              return typeof funcs.error === "function" ? funcs.error() : void 0;
            }
          }, function() {
            return typeof funcs.error === "function" ? funcs.error() : void 0;
          });
        };
      }
      return result;
    };
    this.convertRule = function(name, object) {
      var result, _ref, _ref1, _ref2;
      if (object == null) {
        object = {};
      }
      /*
      Convert the rule object.
      */

      result = {
        name: name,
        enableError: object.invoke === 'watch',
        invoke: object.invoke,
        filter: (_ref = object.filter) != null ? _ref : function(input) {
          return input;
        },
        validator: (_ref1 = object.validator) != null ? _ref1 : function() {
          return true;
        },
        error: (_ref2 = object.error) != null ? _ref2 : '',
        success: object.success
      };
      result.error = _this.convertError(result.error);
      result.success = _this.convertSuccess(result.success);
      result.validator = _this.convertValidator(result.validator);
      return result;
    };
    this.register = function(name, object) {
      if (object == null) {
        object = {};
      }
      /*
      Register the rule.
      @params name: The rule name.
      @params object:
          invoke: 'watch' or 'blur' or undefined(validate by yourself)
          filter: function(input)
          validator: RegExp() or function(value, scope, element, attrs, $injector)
          error: string or function(scope, element, attrs)
          success: function(scope, element, attrs)
      */

      return this.rules[name] = this.convertRule(name, object);
    };
    this.getRule = function(name) {
      /*
      Get the rule form $validator.rules by the name.
      @return rule / null
      */

      if (this.rules[name]) {
        return this.rules[name];
      } else {
        return null;
      }
    };
    this.validate = function(scope, model) {
      /*
      Validate the model.
      @param scope: The scope.
      @param model: The model name of the scope.
      @return:
          @promise success(): The success function.
          @promise error(): The error function.
      */

      var brocadcastObject, count, deferred, func, promise;
      deferred = $q.defer();
      promise = deferred.promise;
      count = {
        total: 0,
        success: 0,
        error: 0
      };
      func = {
        promises: {
          success: [],
          error: []
        },
        accept: function() {
          return count.total++;
        },
        validatedSuccess: function() {
          var x, _i, _len, _ref;
          if (++count.success === count.total) {
            _ref = func.promises.success;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              x = _ref[_i];
              x();
            }
          }
        },
        validatedError: function() {
          var x, _i, _len, _ref;
          if (count.error++ === 0) {
            _ref = func.promises.error;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              x = _ref[_i];
              x();
            }
          }
          return count.error;
        }
      };
      promise.success = function(fn) {
        func.promises.success.push(fn);
        return promise;
      };
      promise.error = function(fn) {
        func.promises.error.push(fn);
        return promise;
      };
      brocadcastObject = {
        model: model,
        accept: func.accept,
        success: func.validatedSuccess,
        error: func.validatedError
      };
      scope.$broadcast(_this.broadcastChannel.prepare, brocadcastObject);
      $timeout(function() {
        var $validator, x, _i, _len, _ref;
        if (count.total === 0) {
          _ref = func.promises.success;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            x = _ref[_i];
            x();
          }
          return;
        }
        $validator = $injector.get('$validator');
        return scope.$broadcast($validator.broadcastChannel.start, brocadcastObject);
      });
      return promise;
    };
    this.reset = function(scope, model) {
      /*
      Reset validated error messages of the model.
      @param scope: The scope.
      @param model: The model name of the scope.
      */

      return scope.$broadcast(_this.broadcastChannel.reset, {
        model: model
      });
    };
    this.get = function($injector) {
      this.setupProviders($injector);
      return {
        rules: this.rules,
        broadcastChannel: this.broadcastChannel,
        register: this.register,
        convertRule: this.convertRule,
        getRule: this.getRule,
        validate: this.validate,
        reset: this.reset
      };
    };
    this.get.$inject = ['$injector'];
    return this.$get = this.get;
  });

}).call(this);
