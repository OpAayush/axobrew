"use strict";

function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Connection = /*#__PURE__*/function () {
  function Connection(connection) {
    _classCallCheck(this, Connection);
    this.connection = connection;
    this.isReady = false;
  }
  return _createClass(Connection, [{
    key: "send",
    value: function send(data) {
      this.connection.send(JSON.stringify(data));
    }
  }, {
    key: "Event",
    value: function Event(event, payload) {
      return {
        type: event,
        payload: payload
      };
    }
  }]);
}();
var Events = {
  Ready: -1,
  AppControlData: 0,
  GetDebugStatus: 1,
  CanLaunchInDebug: 2,
  ReLaunchInDebug: 3,
  GetModules: 4,
  LaunchModule: 5,
  StartService: 6,
  GetServiceStatuses: 7,
  Error: 8,
  CanLaunchModules: 9,
  ModuleAction: 10,
  SetDevServer: 11,
  GetLogs: 12,
  PrefetchModule: 13
};
module.exports = {
  Connection,
  Events
};