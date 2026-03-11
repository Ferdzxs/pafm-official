import React from 'react'
import { Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface PlaceholderProps {
    title: string
    description?: string
}

export default function PlaceholderPage({ title, description }: PlaceholderProps) {
    return (
        <div className="px-4 py-6 sm:px-6 flex items-center justify-center min-h-[60vh] animate-fade-in">
            <Card className="w-full max-w-sm text-center shadow-lg">
                <CardContent className="pt-8 pb-8">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5">
                        <Construction size={28} className="text-white" />
                    </div>
                    <h2 className="font-display font-bold text-2xl text-foreground mb-2">{title}</h2>
                    <p className="text-muted-foreground text-sm">
                        {description ?? 'This module is under development. Full implementation will be available in the next sprint.'}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
