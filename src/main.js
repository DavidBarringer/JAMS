require('./css/main.scss');
import Vue from 'vue';
import _ from 'lodash';
Object.defineProperty(Vue.prototype, '$_', { value: _ });

import VueRouter from 'vue-router';

Vue.use(VueRouter);

import VueAxios from 'vue-axios';
import axios from 'axios';
Vue.use(VueAxios, axios);

import app from './app.vue';

const router = new VueRouter({ mode: 'history' });

new Vue(Vue.util.extend({ router }, app)).$mount('#app');
