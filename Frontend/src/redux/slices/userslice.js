import { createSlice } from '@reduxjs/toolkit';

// Load initial state from storage
const loadUserFromStorage = () => {
  try {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (error) {
    console.error('Error loading user from storage:', error);
  }
  return {
    employeeName: '',
    userName: '',
    emailOfficial: '',
    designation: '',
    teamHead: false,
    profile: null,
    isAuthenticated: false,
  };
};

const initialState = loadUserFromStorage();

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.employeeName = action.payload.employeeName;
      state.userName = action.payload.userName;
      state.emailOfficial = action.payload.emailOfficial;
      state.designation = action.payload.designation;
      state.teamHead = action.payload.teamHead;
      state.profile = action.payload.profile;
      state.isAuthenticated = true;
    },
    clearUser: (state) => {
      state.employeeName = '';
      state.userName = '';
      state.emailOfficial = '';
      state.designation = '';
      state.teamHead = false;
      state.profile = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
