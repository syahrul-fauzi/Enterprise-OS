export interface PasswordService {
    readonly kind: "service";
    readonly name: "identity.password";
    hash(password: string): string;
    verify(password: string, storedHash: string): boolean;
}
export declare const passwordService: PasswordService;
export declare function hashPassword(password: string): string;
export declare function verifyPassword(password: string, storedHash: string): boolean;
//# sourceMappingURL=password.service.d.ts.map