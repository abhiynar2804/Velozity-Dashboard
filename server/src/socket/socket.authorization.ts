import prisma from "../utils/prisma";

export const canAccessProject = async (
  userId: string,
  role: string,
  projectId: string,
): Promise<boolean> => {
  // ADMIN can access everything
  if (role === "ADMIN") {
    return true;
  }

  // PROJECT_MANAGER can access projects they created
  if (role === "PROJECT_MANAGER") {
    const project = await prisma.project.findFirst({
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
    const task = await prisma.task.findFirst({
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

export const getDeveloperProjectTaskIds = async (
  userId: string,
  projectId: string,
): Promise<string[]> => {
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      assignedDeveloperId: userId,
    },
    select: { id: true },
  });

  return tasks.map((task) => task.id);
};
