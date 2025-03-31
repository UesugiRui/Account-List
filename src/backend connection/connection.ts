import axios, { AxiosInstance } from "axios";

const apitestrun: AxiosInstance = axios.create({
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const showResources = async (url: string) => {
  try {
    const response = await apitestrun.get(url);
    return response.data;
  } catch (err) {
    console.error("Error fetching resources: ", err);
    throw err;
  }
};

export const createResources = async (url: string, data: any) => {
  try {
    // Note: No need to set Content-Type header here when sending FormData
    const response = await apitestrun.post(url, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (err) {
    console.error("Error creating resources: ", err);
    throw err;
  }
};


export const updateResources = async (url: string, data: any) => {
  try {
    const response = await apitestrun.put(url, data);
    return response.data;
  } catch (err) {
    console.error("Error updating resources: ", err);
    throw err;
  }
};

export const deleteResources = async (url: string) => {
  try {
    const response = await apitestrun.delete(url);
    return response.data;
  } catch (err) {
    console.error("Error deleting resources: ", err);
    throw err;
  }
};

export default apitestrun;