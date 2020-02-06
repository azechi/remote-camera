import Vue from './vue.js';
import App from "./MasterApp.js";

const vue = new Vue({
  render: h => h(App)
});
vue.$mount("#app");

