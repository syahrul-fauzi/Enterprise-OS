"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginInputSchema = exports.RegisterUserInputSchema = void 0;
exports.UserId = UserId;
exports.TenantId = TenantId;
exports.WorkspaceId = WorkspaceId;
exports.MembershipId = MembershipId;
exports.SessionId = SessionId;
const zod_1 = require("zod");
function UserId(value) {
    return value;
}
function TenantId(value) {
    return value;
}
function WorkspaceId(value) {
    return value;
}
function MembershipId(value) {
    return value;
}
function SessionId(value) {
    return value;
}
exports.RegisterUserInputSchema = zod_1.z.object({
    email: zod_1.z.string().min(3).email(),
    password: zod_1.z.string().min(8),
    displayName: zod_1.z.string().min(1),
});
exports.LoginInputSchema = zod_1.z.object({
    email: zod_1.z.string().min(3).email(),
    password: zod_1.z.string().min(1),
});
