import { create } from "zustand";

const useRoomStore = create((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
}));

export default useRoomStore;
