
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "event_claims": {
                  Row: {
                    "confidence": number,"created_at": string,"event_id": string | null,"id": string,"mandir_id": string,"note": string | null,"proposed": NonNullable<Json>,"reviewed_at": string | null,"reviewed_by": string | null,"source_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confidence"?: number,"created_at"?: string,"event_id"?: string | null,"id"?: string,"mandir_id": string,"note"?: string | null,"proposed": NonNullable<Json>,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "confidence"?: number,"created_at"?: string,"event_id"?: string | null,"id"?: string,"mandir_id"?: string,"note"?: string | null,"proposed"?: NonNullable<Json>,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_claims_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_claims_mandir_id_fkey"
      columns: ["mandir_id"]
isOneToOne: false
      referencedRelation: "mandirs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_claims_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"event_occurrences": {
                  Row: {
                    "cancelled": boolean,"ends_at": string | null,"event_id": string,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled"?: boolean,"ends_at"?: string | null,"event_id": string,"starts_at": string
                  }
                  Update: {
                    "cancelled"?: boolean,"ends_at"?: string | null,"event_id"?: string,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_occurrences_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "all_day": boolean,"confirmed_at": string | null,"confirmed_by": string | null,"cost_note": string | null,"created_at": string,"created_by": string | null,"ends_at": string | null,"festival_date_id": string | null,"id": string,"kind": string,"link": string | null,"location_note": string | null,"mandir_id": string,"origin": string | null,"recurrence": string | null,"starts_at": string,"status": string,"summary": string | null,"summary_gu": string | null,"timezone": string,"title": string,"title_gu": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"cost_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"festival_date_id"?: string | null,"id"?: string,"kind"?: string,"link"?: string | null,"location_note"?: string | null,"mandir_id": string,"origin"?: string | null,"recurrence"?: string | null,"starts_at": string,"status"?: string,"summary"?: string | null,"summary_gu"?: string | null,"timezone"?: string,"title": string,"title_gu"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "all_day"?: boolean,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"cost_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"festival_date_id"?: string | null,"id"?: string,"kind"?: string,"link"?: string | null,"location_note"?: string | null,"mandir_id"?: string,"origin"?: string | null,"recurrence"?: string | null,"starts_at"?: string,"status"?: string,"summary"?: string | null,"summary_gu"?: string | null,"timezone"?: string,"title"?: string,"title_gu"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_festival_date_id_fkey"
      columns: ["festival_date_id"]
isOneToOne: false
      referencedRelation: "festival_dates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_mandir_id_fkey"
      columns: ["mandir_id"]
isOneToOne: false
      referencedRelation: "mandirs"
      referencedColumns: ["id"]
    }
                  ]
                },"festival_dates": {
                  Row: {
                    "calendar": Database["public"]['Enums']["calendar_tradition"] | null,"created_at": string,"ends_on": string,"festival_id": string,"id": string,"source": string | null,"starts_on": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "calendar"?: Database["public"]['Enums']["calendar_tradition"] | null,"created_at"?: string,"ends_on": string,"festival_id": string,"id"?: string,"source"?: string | null,"starts_on": string,"verified"?: boolean
                  }
                  Update: {
                    "calendar"?: Database["public"]['Enums']["calendar_tradition"] | null,"created_at"?: string,"ends_on"?: string,"festival_id"?: string,"id"?: string,"source"?: string | null,"starts_on"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "festival_dates_festival_id_fkey"
      columns: ["festival_id"]
isOneToOne: false
      referencedRelation: "festivals"
      referencedColumns: ["id"]
    }
                  ]
                },"festivals": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"slug": string,"summary": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"slug": string,"summary"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"slug"?: string,"summary"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"mandir_admins": {
                  Row: {
                    "added_at": string,"added_by": string | null,"mandir_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"added_by"?: string | null,"mandir_id": string,"user_id": string
                  }
                  Update: {
                    "added_at"?: string,"added_by"?: string | null,"mandir_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mandir_admins_mandir_id_fkey"
      columns: ["mandir_id"]
isOneToOne: false
      referencedRelation: "mandirs"
      referencedColumns: ["id"]
    }
                  ]
                },"mandir_claims": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by": string | null,"id": string,"mandir_id": string,"message": string | null,"role_at_mandir": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"mandir_id": string,"message"?: string | null,"role_at_mandir": string,"status"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"mandir_id"?: string,"message"?: string | null,"role_at_mandir"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mandir_claims_mandir_id_fkey"
      columns: ["mandir_id"]
isOneToOne: false
      referencedRelation: "mandirs"
      referencedColumns: ["id"]
    }
                  ]
                },"mandir_contacts": {
                  Row: {
                    "email": string | null,"mandir_id": string,"notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email"?: string | null,"mandir_id": string,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "email"?: string | null,"mandir_id"?: string,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mandir_contacts_mandir_id_fkey"
      columns: ["mandir_id"]
isOneToOne: true
      referencedRelation: "mandirs"
      referencedColumns: ["id"]
    }
                  ]
                },"mandirs": {
                  Row: {
                    "calendar": Database["public"]['Enums']["calendar_tradition"] | null,"charity_number": string | null,"created_at": string,"id": string,"latitude": number | null,"longitude": number | null,"name": string,"phone": string | null,"postcode": string | null,"region": string,"slug": string,"status": string,"town": string,"tradition": string | null,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "calendar"?: Database["public"]['Enums']["calendar_tradition"] | null,"charity_number"?: string | null,"created_at"?: string,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"name": string,"phone"?: string | null,"postcode"?: string | null,"region": string,"slug": string,"status"?: string,"town": string,"tradition"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "calendar"?: Database["public"]['Enums']["calendar_tradition"] | null,"charity_number"?: string | null,"created_at"?: string,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"name"?: string,"phone"?: string | null,"postcode"?: string | null,"region"?: string,"slug"?: string,"status"?: string,"town"?: string,"tradition"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"seva_roles": {
                  Row: {
                    "created_at": string,"description": string | null,"event_id": string,"id": string,"name": string,"needs_dbs": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"event_id": string,"id"?: string,"name": string,"needs_dbs"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"event_id"?: string,"id"?: string,"name"?: string,"needs_dbs"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "seva_roles_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"seva_shifts": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"needed": number,"role_id": string,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"needed": number,"role_id": string,"starts_at": string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"needed"?: number,"role_id"?: string,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seva_shifts_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "seva_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"sources": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"label": string | null,"last_checked_at": string | null,"mandir_id": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"label"?: string | null,"last_checked_at"?: string | null,"mandir_id": string,"url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"label"?: string | null,"last_checked_at"?: string | null,"mandir_id"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sources_mandir_id_fkey"
      columns: ["mandir_id"]
isOneToOne: false
      referencedRelation: "mandirs"
      referencedColumns: ["id"]
    }
                  ]
                },"toran_admins": {
                  Row: {
                    "added_at": string,"note": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"note"?: string | null,"user_id": string
                  }
                  Update: {
                    "added_at"?: string,"note"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "decide_mandir_claim":
{ Args: { "approve": boolean,"claim": string }; Returns: undefined
                           },
"edit_event":
{ Args: { "dates": (string)[],"details": Json,"target": string,"today": string }; Returns: undefined
                           },
"health":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_mandir_admin":
{ Args: { "target": string }; Returns: boolean
                           },
"is_toran_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mandir_admin_list":
{ Args: { "target": string }; Returns: {
              "added_at": string,"email": string,"user_id": string
            }[]
                           },
"pending_mandir_claims":
{ Args: Record<PropertyKey, never>; Returns: {
              "claimant_email": string,"created_at": string,"id": string,"mandir_name": string,"mandir_phone": string,"mandir_slug": string,"mandir_town": string,"mandir_website": string,"message": string,"role_at_mandir": string
            }[]
                           },
"remove_mandir_admin":
{ Args: { "member": string,"target": string }; Returns: undefined
                           }
          }
          Enums: {
            "calendar_tradition": "gujarati"|"north_indian"|"tamil"|"bengali"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "calendar_tradition": ["gujarati", "north_indian", "tamil", "bengali", "other"]
          }
        }
} as const
