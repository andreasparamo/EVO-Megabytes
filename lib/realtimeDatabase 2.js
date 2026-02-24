import {
  ref,
  set,
  update,
  onValue,
  remove,
  get,
  push,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { rtdb } from "./firebase";

export { ref, set, update, onValue, remove, get, push, onDisconnect, rtdbServerTimestamp, rtdb };