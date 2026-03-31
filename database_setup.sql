-- learning_history テーブルの作成
CREATE TABLE IF NOT EXISTS public.learning_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.learning_history ENABLE ROW LEVEL SECURITY;

-- Select (読み取り) ポリシー: 自分のデータのみ取得可能
CREATE POLICY "Users can view their own learning history" 
ON public.learning_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Insert (作成) ポリシー: 自分のデータとしてのみ追加可能
CREATE POLICY "Users can insert their own learning history" 
ON public.learning_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update, Delete に関しては今回は使用しない想定だが、必要に応じて同様に設定可能
