export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            coin_transactions: {
                Row: {
                    amount: number
                    created_at: string | null
                    id: string
                    reason: string
                    reference_id: string | null
                    user_id: string
                }
                Insert: {
                    amount: number
                    created_at?: string | null
                    id?: string
                    reason: string
                    reference_id?: string | null
                    user_id: string
                }
                Update: {
                    amount?: number
                    created_at?: string | null
                    id?: string
                    reason?: string
                    reference_id?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "coin_transactions_reference_id_fkey"
                        columns: ["reference_id"]
                        isOneToOne: false
                        referencedRelation: "game_logs"
                        referencedColumns: ["id"]
                    },
                ]
            }
            game_logs: {
                Row: {
                    created_at: string | null
                    game_id: string
                    id: string
                    metadata: Json | null
                    play_time: number
                    score: number
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    game_id: string
                    id?: string
                    metadata?: Json | null
                    play_time: number
                    score: number
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    game_id?: string
                    id?: string
                    metadata?: Json | null
                    play_time?: number
                    score?: number
                    user_id?: string
                }
                Relationships: []
            }
            games: {
                Row: {
                    created_at: string | null
                    description: string | null
                    id: string
                    thumbnail_url: string | null
                    title: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    id: string
                    thumbnail_url?: string | null
                    title: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    thumbnail_url?: string | null
                    title?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    class: number | null
                    coin_balance: number | null
                    created_at: string | null
                    grade: number | null
                    id: string
                    login_id: string | null
                    nickname: string | null
                    role: Database["public"]["Enums"]["user_role"] | null
                    username: string | null
                    last_weekly_settlement: string | null
                }
                Insert: {
                    class?: number | null
                    coin_balance?: number | null
                    created_at?: string | null
                    grade?: number | null
                    id: string
                    login_id?: string | null
                    nickname?: string | null
                    role?: Database["public"]["Enums"]["user_role"] | null
                    username?: string | null
                    last_weekly_settlement?: string | null
                }
                Update: {
                    class?: number | null
                    coin_balance?: number | null
                    created_at?: string | null
                    grade?: number | null
                    id?: string
                    login_id?: string | null
                    nickname?: string | null
                    role?: Database["public"]["Enums"]["user_role"] | null
                    username?: string | null
                    last_weekly_settlement?: string | null
                }
                Relationships: []
            }
            question_sets: {
                Row: {
                    class: number | null
                    created_at: string | null
                    created_by: string | null
                    game_id: string | null
                    grade: number | null
                    id: string
                    is_active: boolean | null
                    question_mode: string | null
                    title: string
                }
                Insert: {
                    class?: number | null
                    created_at?: string | null
                    created_by?: string | null
                    game_id?: string | null
                    grade?: number | null
                    id?: string
                    is_active?: boolean | null
                    question_mode?: string | null
                    title: string
                }
                Update: {
                    class?: number | null
                    created_at?: string | null
                    created_by?: string | null
                    game_id?: string | null
                    grade?: number | null
                    id?: string
                    is_active?: boolean | null
                    question_mode?: string | null
                    title?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "question_sets_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "question_sets_game_id_fkey"
                        columns: ["game_id"]
                        isOneToOne: false
                        referencedRelation: "games"
                        referencedColumns: ["id"]
                    },
                ]
            }
            questions: {
                Row: {
                    answer_text: string | null
                    correct_answer: number | null
                    created_at: string | null
                    id: string
                    options: Json
                    question_text: string
                    set_id: string | null
                    type: string | null
                }
                Insert: {
                    answer_text?: string | null
                    correct_answer?: number | null
                    created_at?: string | null
                    id?: string
                    options: Json
                    question_text: string
                    set_id?: string | null
                    type?: string | null
                }
                Update: {
                    answer_text?: string | null
                    correct_answer?: number | null
                    created_at?: string | null
                    id?: string
                    options?: Json
                    question_text?: string
                    set_id?: string | null
                    type?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "questions_set_id_fkey"
                        columns: ["set_id"]
                        isOneToOne: false
                        referencedRelation: "question_sets"
                        referencedColumns: ["id"]
                    },
                ]
            }
            student_items: {
                Row: {
                    created_at: string
                    id: string
                    item_id: string
                    item_name: string
                    quantity: number
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    item_id: string
                    item_name: string
                    quantity?: number
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    item_id?: string
                    item_name?: string
                    quantity?: number
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "student_items_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            tournament_logs: {
                Row: {
                    created_at: string | null
                    id: string
                    play_time: number | null
                    score: number | null
                    tournament_id: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    play_time?: number | null
                    score?: number | null
                    tournament_id?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    play_time?: number | null
                    score?: number | null
                    tournament_id?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "tournament_logs_tournament_id_fkey"
                        columns: ["tournament_id"]
                        isOneToOne: false
                        referencedRelation: "tournaments"
                        referencedColumns: ["id"]
                    },
                ]
            }
            tournament_participants: {
                Row: {
                    attempts_used: number | null
                    best_score: number | null
                    created_at: string | null
                    id: string
                    last_played_at: string | null
                    tournament_id: string | null
                    user_id: string | null
                }
                Insert: {
                    attempts_used?: number | null
                    best_score?: number | null
                    created_at?: string | null
                    id?: string
                    last_played_at?: string | null
                    tournament_id?: string | null
                    user_id?: string | null
                }
                Update: {
                    attempts_used?: number | null
                    best_score?: number | null
                    created_at?: string | null
                    id?: string
                    last_played_at?: string | null
                    tournament_id?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "tournament_participants_tournament_id_fkey"
                        columns: ["tournament_id"]
                        isOneToOne: false
                        referencedRelation: "tournaments"
                        referencedColumns: ["id"]
                    },
                ]
            }
            tournaments: {
                Row: {
                    class: number | null
                    created_at: string | null
                    created_by: string | null
                    end_time: string | null
                    game_id: string | null
                    grade: number | null
                    id: string
                    is_active: boolean | null
                    question_set_id: string | null
                    start_time: string | null
                    title: string | null
                }
                Insert: {
                    class?: number | null
                    created_at?: string | null
                    created_by?: string | null
                    end_time?: string | null
                    game_id?: string | null
                    grade?: number | null
                    id?: string
                    is_active?: boolean | null
                    question_set_id?: string | null
                    start_time?: string | null
                    title?: string | null
                }
                Update: {
                    class?: number | null
                    created_at?: string | null
                    created_by?: string | null
                    end_time?: string | null
                    game_id?: string | null
                    grade?: number | null
                    id?: string
                    is_active?: boolean | null
                    question_set_id?: string | null
                    start_time?: string | null
                    title?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "tournaments_question_set_id_fkey"
                        columns: ["question_set_id"]
                        isOneToOne: false
                        referencedRelation: "question_sets"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            increment_coin_balance: {
                Args: { amount_arg: number; user_id_arg: string }
                Returns: undefined
            }
        }
        Enums: {
            user_role: "admin" | "teacher" | "student"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {
            user_role: ["admin", "teacher", "student"],
        },
    },
} as const
