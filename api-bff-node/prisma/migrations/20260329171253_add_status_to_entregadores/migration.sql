-- CreateEnum
CREATE TYPE "StatusEntregador" AS ENUM ('OFFLINE', 'DISPONIVEL', 'EM_ENTREGA');

-- AlterTable
ALTER TABLE "entregadores" ADD COLUMN     "status" "StatusEntregador" NOT NULL DEFAULT 'DISPONIVEL';
