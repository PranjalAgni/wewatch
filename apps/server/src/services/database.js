import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class DatabaseService {
  // Room operations
  async createRoom(code, expirationHours = 24) {
    return await prisma.room.create({
      data: {
        code,
        expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000)
      }
    });
  }

  async findRoomByCode(code) {
    return await prisma.room.findUnique({
      where: { code }
    });
  }

  async isRoomValid(code) {
    const room = await this.findRoomByCode(code);
    
    if (!room) {
      return { valid: false, reason: "Room not found" };
    }

    if (!room.isActive) {
      return { valid: false, reason: "Room is no longer active" };
    }

    if (room.expiresAt && new Date() > room.expiresAt) {
      return { valid: false, reason: "Room has expired" };
    }

    return { valid: true, room };
  }

  // Message operations
  async createMessage(code, username, content, replyToId = null) {
    return await prisma.message.create({
      data: {
        code,
        username,
        content,
        replyToId,
      },
    });
  }

  async getMessageHistory(code, limit = 1500) {
    return await prisma.message.findMany({
      where: { code },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  // Cleanup method
  async disconnect() {
    await prisma.$disconnect();
  }
}

export default new DatabaseService();
