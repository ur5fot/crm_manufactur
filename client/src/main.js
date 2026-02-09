import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import "./styles.css";

const routes = [
  { path: "/", name: "dashboard", component: App },
  { path: "/cards/:id?", name: "cards", component: App },
  { path: "/table", name: "table", component: App },
  { path: "/logs", name: "logs", component: App }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

const app = createApp(App);
app.use(router);
app.mount("#app");
