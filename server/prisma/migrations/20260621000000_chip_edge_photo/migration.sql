-- AlterTable: add an edge (side) reference photo per chip denomination
ALTER TABLE "chip_denominations" ADD COLUMN "edge_photo_id" UUID;

-- AddForeignKey
ALTER TABLE "chip_denominations" ADD CONSTRAINT "chip_denominations_edge_photo_id_fkey" FOREIGN KEY ("edge_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
