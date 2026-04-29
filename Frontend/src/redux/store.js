import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../redux/slices/userslice';

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

// Subscribe to store changes and sync to storage
store.subscribe(() => {
  const state = store.getState();
  const userData = state.user;
  
  if (userData.isAuthenticated) {
    // Check if user wants to be remembered (you can add this logic)
    const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(userData));
  }
});

export default store;
