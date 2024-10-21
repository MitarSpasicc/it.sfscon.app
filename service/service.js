import store from "../store/store";
import { storageGetItem } from "../tools/secureStore";
import axios from "axios";

axios.interceptors.request.use(async (config) => {
  const server = "https://m.opencon.dev";
  const jwt = await storageGetItem("jwt");

  const configData = {
    ...config,
    baseURL: server,
  };

  if (!jwt) {
    return configData;
  }

  return {
    ...configData,
    headers: {
      ...config.headers,
      Authorization: `Bearer ${jwt}`,
    },
  };
});

axios.interceptors.response.use(
  function (response) {
    return response;
  },
  async function (error) {
    const status = error?.response?.request?.status;
    const { readFromBackupServer } = await import(
      "../store/actions/AppActions"
    );
    if (status === 502) {
      store.dispatch(readFromBackupServer());
    }
    return Promise.reject(error);
  }
);

export default axios;
