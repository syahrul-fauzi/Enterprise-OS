"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordService = void 0;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.slugifyForTenant = slugifyForTenant;
var crypto = require("node:crypto");
var SCRYPT_KEYLEN = 64;
var SALT_BYTES = 16;
var SALT_SEPARATOR = "$";
function scryptDerive(password, salt) {
    var derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    return "".concat(salt.toString("hex")).concat(SALT_SEPARATOR).concat(derived.toString("hex"));
}
exports.passwordService = Object.freeze({
    kind: "service",
    name: "identity.password",
    hash: function (password) {
        var salt = crypto.randomBytes(SALT_BYTES);
        return scryptDerive(password, salt);
    },
    verify: function (password, storedHash) {
        try {
            var saltHex = storedHash.split(SALT_SEPARATOR)[0];
            if (!saltHex)
                return false;
            var salt = Buffer.from(saltHex, "hex");
            var expected = scryptDerive(password, salt);
            return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(storedHash, "utf8"));
        }
        catch (_a) {
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
// Canonical slugification service for tenant/workspace URLs
function slugifyForTenant(input) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40) || "organization";
}
