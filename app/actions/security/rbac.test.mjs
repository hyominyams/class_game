import test from "node:test";
import assert from "node:assert/strict";

import {
    canAccessClassScope,
    canManageStudent,
    getAllowedRolesForPath,
    getDashboardPathForRole,
    isRoleAuthorizedForPath,
} from "./rbac.ts";

test("route role rules match expected matrix", () => {
    assert.deepEqual(getAllowedRolesForPath("/admin"), ["admin"]);
    assert.deepEqual(getAllowedRolesForPath("/teacher/questions"), ["teacher", "admin"]);
    assert.deepEqual(getAllowedRolesForPath("/student/dashboard"), ["student"]);
    assert.equal(getAllowedRolesForPath("/login"), null);
});

test("route role authorization works for protected routes", () => {
    assert.equal(isRoleAuthorizedForPath("/admin/dashboard", "admin"), true);
    assert.equal(isRoleAuthorizedForPath("/admin/dashboard", "teacher"), false);
    assert.equal(isRoleAuthorizedForPath("/teacher/dashboard", "admin"), true);
    assert.equal(isRoleAuthorizedForPath("/teacher/dashboard", "teacher"), true);
    assert.equal(isRoleAuthorizedForPath("/teacher/dashboard", "student"), false);
    assert.equal(isRoleAuthorizedForPath("/student/dashboard", "student"), true);
    assert.equal(isRoleAuthorizedForPath("/student/dashboard", "admin"), false);
});

test("dashboard mapping is deterministic", () => {
    assert.equal(getDashboardPathForRole("admin"), "/admin/dashboard");
    assert.equal(getDashboardPathForRole("teacher"), "/teacher/dashboard");
    assert.equal(getDashboardPathForRole("student"), "/student/dashboard");
});

test("class scope checks enforce teacher scope with admin override", () => {
    assert.equal(
        canAccessClassScope({ role: "admin", grade: null, classNum: null }, 6, 2),
        true
    );
    assert.equal(
        canAccessClassScope({ role: "teacher", grade: 5, classNum: 1 }, 5, 1),
        true
    );
    assert.equal(
        canAccessClassScope({ role: "teacher", grade: 5, classNum: 1 }, 5, 2),
        false
    );
    assert.equal(
        canAccessClassScope({ role: "student", grade: 5, classNum: 1 }, 5, 1),
        false
    );
});

test("student management only allows admin or in-scope teacher", () => {
    const targetStudent = { role: "student", grade: 4, classNum: 3 };

    assert.equal(
        canManageStudent({ role: "admin", grade: null, classNum: null }, targetStudent),
        true
    );
    assert.equal(
        canManageStudent({ role: "teacher", grade: 4, classNum: 3 }, targetStudent),
        true
    );
    assert.equal(
        canManageStudent({ role: "teacher", grade: 4, classNum: 2 }, targetStudent),
        false
    );
    assert.equal(
        canManageStudent(
            { role: "teacher", grade: 4, classNum: 3 },
            { role: "teacher", grade: 4, classNum: 3 }
        ),
        false
    );
});
