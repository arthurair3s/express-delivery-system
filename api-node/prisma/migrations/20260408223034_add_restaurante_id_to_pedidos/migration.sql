/*
  Warnings:

  - The `status` column on the `entregadores` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "entregadores" DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(50) DEFAULT 'DISPONIVEL';

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "destino_latitude" DOUBLE PRECISION,
ADD COLUMN     "destino_longitude" DOUBLE PRECISION,
ADD COLUMN     "restaurante_id" INTEGER;

-- DropEnum
DROP TYPE "StatusEntregador";

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
