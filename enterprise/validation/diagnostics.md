# EKL Compiler Diagnostics Catalog

| Diagnostic Code | Severity | Description |
|-----------------|----------|-------------|
| EKL-0001        | Error    | Package manifest not found at expected location |
| EKL-0002        | Error    | Failed to load manifest file |
| EKL-0003        | Error    | Invalid object entry in package manifest (missing id or location) |
| EKL-0004        | Error    | Failed to load object file |
| EKL-0005        | Error    | Invalid relationship entry in package manifest (missing id or location) |
| EKL-0006        | Error    | Failed to load relationship file |
| EKL-1001        | Error    | Schema validation failed for manifest |
| EKL-1002        | Error    | Object schema validation failed |
| EKL-1003        | Error    | Relationship schema validation failed |
| EKL-2001        | Error    | Invalid or missing object type |
| EKL-2002        | Error    | Unknown or missing relationship type |
| EKL-2003        | Error    | Invalid source type for relationship, source missing, not found, or cannot be resolved |
| EKL-2004        | Error    | Invalid target type for relationship, target missing, not found, or cannot be resolved |
| EKL-2006        | Warning  | Duplicate relationship (same source-target-type already exists) |
| EKL-2101        | Error    | Canonical Object Graph not available for semantic validation |
| EKL-4001        | Error    | No Enterprise IR available for reasoning |
| EKL-5001        | Error    | No symbol table available for reference resolution |
| EKL-6001        | Error    | Constraint engine requires a BoundModel |
| EKL-C001        | Error    | Every business capability must have an accountable owner |
| EKL-C002        | Error    | Every business capability must realize at least one business service |
| EKL-C003        | Error    | Relationship direction must be valid |
| EKL-C004        | Error    | Object IDs must be globally unique |
| EKL-C005        | Warning  | Deprecated objects cannot be relationship targets |
