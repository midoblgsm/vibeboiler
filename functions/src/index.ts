import * as admin from "firebase-admin";

admin.initializeApp();

export { getProfile, updateProfile } from "./api/users";
