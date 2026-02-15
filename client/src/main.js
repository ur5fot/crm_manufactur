import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import ReportsView from "./views/ReportsView.vue";
import EmployeeCardsView from "./views/EmployeeCardsView.vue";
import "./styles.css";

const routes = [
  { path: "/", name: "dashboard", component: App },
  { path: "/cards/:id?", name: "cards", component: EmployeeCardsView },
  { path: "/table", name: "table", component: App },
  { path: "/reports", name: "reports", component: ReportsView },
  { path: "/import", name: "import", component: App },
  { path: "/templates", name: "templates", component: App },
  { path: "/document-history", name: "document-history", component: App },
  { path: "/placeholder-reference/:employeeId?", name: "placeholder-reference", component: App },
  { path: "/logs", name: "logs", component: App }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

const app = createApp(App);
app.use(router);
app.mount("#app");
