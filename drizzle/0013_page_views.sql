CREATE TABLE "page_views" (
	"day" date NOT NULL,
	"path" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_views_day_path_pk" PRIMARY KEY("day","path")
);
