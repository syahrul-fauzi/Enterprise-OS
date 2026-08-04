const fs = require("fs");
const yaml = require("yaml");
const yamlPath = "../../../../enterprise/science/gate-c/execution/coverage-matrix.yaml";
let content = fs.readFileSync(yamlPath, "utf8");

let doc = yaml.parse(content);

doc.matrix.N5.actual = {
  verdict: "FAIL",
  ia20_constitutional_validity: false,
  truth_table_row: "N5",
  diagnostic_predicate_failure: "pred_a_legitimate_and_pred_c_provable"
};
doc.matrix.N5.primary_run_id = "run-009";
doc.matrix.N5.run_id = "run-009";
doc.matrix.N5.status = "COMPLETE_PRIMARY_AND_REPLAY_COMPLETE";

doc.matrix.N6.actual = {
  verdict: "FAIL",
  ia20_constitutional_validity: false,
  truth_table_row: "N6",
  diagnostic_predicate_failure: "pred_b_meaning_preserved_and_pred_c_provable"
};
doc.matrix.N6.primary_run_id = "run-010";
doc.matrix.N6.run_id = "run-010";
doc.matrix.N6.status = "COMPLETE_PRIMARY_AND_REPLAY_COMPLETE";

doc.matrix.N7.actual = {
  verdict: "FAIL",
  ia20_constitutional_validity: false,
  truth_table_row: "N7",
  diagnostic_predicate_failure: "pred_a_legitimate_and_pred_b_meaning_preserved_and_pred_c_provable"
};
doc.matrix.N7.primary_run_id = "run-011";
doc.matrix.N7.run_id = "run-011";
doc.matrix.N7.status = "COMPLETE_PRIMARY_AND_REPLAY_COMPLETE";

doc.summary.completed_rows = 8;
doc.summary.coverage_percent = 100.0;
doc.summary.phase_b_negative_matrix_complete = true;

doc.next_actions_immediate = ["All Gate C1 matrix completed"];

fs.writeFileSync(yamlPath, yaml.stringify(doc), "utf8");
