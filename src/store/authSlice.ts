import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import type { AdminUser } from "../lib/types";

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  hydrated: boolean;
  locale: "en" | "hi";
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  hydrated: false,
  locale: "en",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrate(state) {
      state.accessToken = Cookies.get("adminAccessToken") || null;
      const raw = localStorage.getItem("adminUser");
      state.user = raw ? (JSON.parse(raw) as AdminUser) : null;
      state.locale = (localStorage.getItem("adminLocale") as "en" | "hi") || "en";
      state.hydrated = true;
    },
    setCredentials(
      state,
      action: PayloadAction<{ user: AdminUser; accessToken: string; refreshToken: string }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      Cookies.set("adminAccessToken", action.payload.accessToken, { expires: 1 });
      Cookies.set("adminRefreshToken", action.payload.refreshToken, { expires: 30 });
      localStorage.setItem("adminUser", JSON.stringify(action.payload.user));
    },
    setLocale(state, action: PayloadAction<"en" | "hi">) {
      state.locale = action.payload;
      localStorage.setItem("adminLocale", action.payload);
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      Cookies.remove("adminAccessToken");
      Cookies.remove("adminRefreshToken");
      localStorage.removeItem("adminUser");
    },
  },
});

export const { hydrate, setCredentials, setLocale, logout } = authSlice.actions;
export default authSlice.reducer;
