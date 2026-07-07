export class SubflowApiError extends Error {
    code;
    status;
    details;
    constructor(code, message, status, details = {}) {
        super(message);
        this.name = "SubflowApiError";
        this.code = code;
        this.status = status;
        this.details = details;
    }
}
