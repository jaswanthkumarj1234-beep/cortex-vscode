"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSignal = exports.QueryType = exports.EdgeRelation = exports.MemoryType = exports.EventSource = exports.EventType = void 0;
// ═══════════════════════════════════════════════════════════
//  EVENTS — What the IDE tells the brain
// ═══════════════════════════════════════════════════════════
var EventType;
(function (EventType) {
    EventType["CODE_EDIT"] = "code_edit";
    EventType["FILE_OPEN"] = "file_open";
    EventType["FILE_CREATE"] = "file_create";
    EventType["FILE_DELETE"] = "file_delete";
    EventType["FILE_RENAME"] = "file_rename";
    EventType["FILE_SAVE"] = "file_save";
    EventType["CHAT_MESSAGE"] = "chat_message";
    EventType["CHAT_RESPONSE"] = "chat_response";
    EventType["DEBUG_START"] = "debug_start";
    EventType["DEBUG_END"] = "debug_end";
    EventType["TERMINAL_COMMAND"] = "terminal_command";
    EventType["TERMINAL_OUTPUT"] = "terminal_output";
    EventType["ERROR_DIAGNOSTIC"] = "error_diagnostic";
    EventType["GIT_COMMIT"] = "git_commit";
})(EventType || (exports.EventType = EventType = {}));
var EventSource;
(function (EventSource) {
    EventSource["EDITOR"] = "editor";
    EventSource["CHAT"] = "chat";
    EventSource["TERMINAL"] = "terminal";
    EventSource["DEBUG"] = "debug";
    EventSource["GIT"] = "git";
    EventSource["SYSTEM"] = "system";
})(EventSource || (exports.EventSource = EventSource = {}));
// ═══════════════════════════════════════════════════════════
//  MEMORY — What the brain remembers
// ═══════════════════════════════════════════════════════════
var MemoryType;
(function (MemoryType) {
    MemoryType["DECISION"] = "decision";
    MemoryType["CODE_CHANGE"] = "code_change";
    MemoryType["BUG_FIX"] = "bug_fix";
    MemoryType["INSIGHT"] = "insight";
    MemoryType["CORRECTION"] = "correction";
    MemoryType["CONVENTION"] = "convention";
    MemoryType["FILE_SNAPSHOT"] = "file_snapshot";
    MemoryType["DEPENDENCY"] = "dependency";
    MemoryType["PROVEN_PATTERN"] = "proven_pattern";
    MemoryType["FAILED_SUGGESTION"] = "failed_suggestion";
    MemoryType["CONVERSATION"] = "conversation";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
// ═══════════════════════════════════════════════════════════
//  GRAPH — How memories connect
// ═══════════════════════════════════════════════════════════
var EdgeRelation;
(function (EdgeRelation) {
    EdgeRelation["CAUSED_BY"] = "CAUSED_BY";
    EdgeRelation["FIXED_BY"] = "FIXED_BY";
    EdgeRelation["REPLACED_BY"] = "REPLACED_BY";
    EdgeRelation["DEPENDS_ON"] = "DEPENDS_ON";
    EdgeRelation["DECIDED_FOR"] = "DECIDED_FOR";
    EdgeRelation["LED_TO"] = "LED_TO";
    EdgeRelation["RELATED_TO"] = "RELATED_TO";
})(EdgeRelation || (exports.EdgeRelation = EdgeRelation = {}));
// ═══════════════════════════════════════════════════════════
//  RETRIEVAL — How the brain recalls
// ═══════════════════════════════════════════════════════════
var QueryType;
(function (QueryType) {
    QueryType["SEMANTIC"] = "semantic";
    QueryType["TEMPORAL"] = "temporal";
    QueryType["STRUCTURAL"] = "structural";
    QueryType["CAUSAL"] = "causal";
    QueryType["EXPLORATORY"] = "exploratory";
})(QueryType || (exports.QueryType = QueryType = {}));
// ═══════════════════════════════════════════════════════════
//  FEEDBACK — How the brain learns
// ═══════════════════════════════════════════════════════════
var UserSignal;
(function (UserSignal) {
    UserSignal["ACCEPTED"] = "accepted";
    UserSignal["REJECTED"] = "rejected";
    UserSignal["CORRECTED"] = "corrected";
})(UserSignal || (exports.UserSignal = UserSignal = {}));
//# sourceMappingURL=types.js.map