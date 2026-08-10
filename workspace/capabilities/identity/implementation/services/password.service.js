"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordService = void 0;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const crypto = __importStar(require("node:crypto"));
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const SALT_SEPARATOR = "$";
function scryptDerive(password, salt) {
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    return `${salt.toString("hex")}${SALT_SEPARATOR}${derived.toString("hex")}`;
}
exports.passwordService = Object.freeze({
    kind: "service",
    name: "identity.password",
    hash(password) {
        const salt = crypto.randomBytes(SALT_BYTES);
        return scryptDerive(password, salt);
    },
    verify(password, storedHash) {
        try {
            const [saltHex] = storedHash.split(SALT_SEPARATOR);
            if (!saltHex)
                return false;
            const salt = Buffer.from(saltHex, "hex");
            const expected = scryptDerive(password, salt);
            return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(storedHash, "utf8"));
        }
        catch {
            return false;
        }
    },
});
function hashPassword(password) {
    return exports.passwordService.hash(password);
}
function verifyPassword(password, storedHash) {
    return exports.passwordService.verify(password, storedHash);
}
