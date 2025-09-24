/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTION_API_KEY: string
  readonly VITE_RECIPES_DATABASE_ID: string
  readonly VITE_INGREDIENTS_DATABASE_ID: string
  readonly API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
