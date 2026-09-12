"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAccessProject = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const canAccessProject = async (userId, role, projectId) => {
    // ADMIN can access everything
    if (role === "ADMIN") {
        return true;
    }
    // PROJECT_MANAGER can access projects they created
    if (role === "PROJECT_MANAGER") {
        const project = await prisma_1.default.project.findFirst({
            where: {
                id: projectId,
                createdById: userId,
            },
            select: {
                id: true,
            },
        });
        return !!project;
    }
    // DEVELOPER can access projects
    // where they have an assigned task
    if (role === "DEVELOPER") {
        const task = await prisma_1.default.task.findFirst({
            where: {
                projectId,
                assignedDeveloperId: userId,
            },
            select: {
                id: true,
            },
        });
        return !!task;
    }
    return false;
};
exports.canAccessProject = canAccessProject;
