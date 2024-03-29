import type { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { UploadedFile } from 'express-fileupload';
import { getPool } from '../util/db.js';
import { handleError, StatusError } from '../util/error.js';
import {
  validateMinMaxLength, validateBoolean, validateIfDefined,
} from '../util/validation.js';
import sharp from 'sharp';
import UserModel from '../models/user.js';
import SessionModel from '../models/session.js';
import PhotoModel from '../models/photo.js';

export async function getMyProfile(req: Request, res: Response) {
  let client;
  try {
    client = await getPool().connect();

    const uid = await new SessionModel(client, req.cookies.session).getUserId();
    const user = new UserModel(client, uid);
    const profile = await user.getProfile();
    res.json(profile);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function updateProfile(req: Request, res: Response) {
  let client;

  try {
    const username = validateIfDefined<string>(
      req.body.username, x => validateMinMaxLength(x, 1, 64)
    );
    const name = validateIfDefined<string>(req.body.name, x => validateMinMaxLength(x, 1, 255));
    const email = validateIfDefined<string>(req.body.email, x => validateMinMaxLength(x, 1, 255));
    const phone = validateIfDefined<string>(req.body.phone, x => validateMinMaxLength(x, 5, 20));
    const isPublic = validateBoolean(req.body.public);

    client = await getPool().connect();

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();
    const user = new UserModel(client, myUid);
    const profile = await user.getProfile();

    const promises: Promise<any>[] = [];

    if (username && username.length && username !== profile.username) {
      if (username.toLowerCase() === profile.username.toLowerCase()) {
        // We're just changing the case here.
        promises.push(user.updateUserField('username', username));
      } else {
        const uid = await UserModel.getIdForUsername(client, username);
        if (uid !== null) {
          // This username is already taken.
          res.status(409);
          return;
        } else {
          promises.push(user.updateUserField('username', username));
        }
      }
    }

    if (name && name.length && name !== profile.name) {
      promises.push(user.updateUserField('name', name));
    }

    if (email && email.length && email !== profile.email) {
      promises.push(user.updateUserField('email', email));
    }

    if (phone && phone.length && phone !== profile.phone) {
      promises.push(user.updateUserField('phone', phone));
    }

    if (isPublic !== profile.public) {
      promises.push(user.updateUserField('public', isPublic));
    }

    await Promise.all(promises);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function getUserInfo(req: Request, res: Response) {
  let client;

  try {
    const session = req.cookies.session;
    const uid = req.params.uid;

    client = await getPool().connect();
    if (session) {
      const myUid = await new SessionModel(client, session).getUserId();
      const contact = await new UserModel(client, myUid).getContact(uid);
      res.json(contact);
    } else {
      const user = await new UserModel(client, uid).getMinUser();
      res.json(user);
    }
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

const allowedExtensions = new Set(['.png', '.jpg', '.jpeg']);
export async function uploadProfilePhoto(req: Request, res: Response) {
  if (!req.files || !req.files.photo || !(req.files.photo as UploadedFile).name) {
    res.status(400).end('No file specified');
    return;
  }
  const file = req.files.photo as UploadedFile;
  const ext = path.extname(file.name);
  if (!allowedExtensions.has(ext)) {
    res.status(400).end(`File type '${ext}' not allowed`);
    return;
  }

  let client;
  try {
    client = await getPool().connect();

    const photo = new PhotoModel(file);
    const {path: tmpPath, filename} = await photo.upload({ allowedExtensions, useTempDir: true });
    const uploadPath = `${process.env.UPLOAD_DIR}/${filename}`;

    const myUid = await new SessionModel(client, req.cookies.session).getUserId();
    const user = new UserModel(client, myUid);
    const avatarInfo = await user.getIdAndAvatar();
    if (avatarInfo === null) {
      res.status(404);
      return;
    }
    const oldAvatar = avatarInfo.avatar_url;
    const promises = [
      user.updateUserField('avatar_url', filename),
    ];
    if (oldAvatar) {
      promises.push(fs.unlink(`${process.env.UPLOAD_DIR}/${oldAvatar}`));
    }
    await Promise.all(promises);

    await sharp(tmpPath)
      .resize(128, 128)
      .toFile(uploadPath);
    res.end(filename);
    await fs.unlink(tmpPath);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}

export async function changePassword(req: Request, res: Response) {
  let client;
  try {
    const currentPassword = validateMinMaxLength(req.body.currentPassword, 1, 255);
    const newPassword = validateMinMaxLength(req.body.newPassword, 6, 255);
    const confirmPassword = req.body.confirmPassword;

    if (confirmPassword !== newPassword) {
      throw new StatusError(400, 'Passwords not equal');
    }

    client = await getPool().connect();

    const uid = await new SessionModel(client, req.cookies.session).getUserId();
    await new UserModel(client, uid).changePassword(currentPassword, newPassword);
  } catch (e) {
    handleError(e, res);
  } finally {
    client && client.release();
    res.end();
  }
}
