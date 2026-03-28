import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { LogOut } from "lucide-react"

interface Athlete {
    id: number
    city: string
    firstname: string
    lastname: string
    profile: string
}

interface AthleteAvatarProps {
    athlete: Athlete
    onLogout: () => void
}

export function AthleteAvatar({ athlete, onLogout }: AthleteAvatarProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0 hover:ring-2 hover:ring-[#FC4C02]/40 transition-all">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={athlete.profile} alt={`${athlete.firstname} ${athlete.lastname}`} />
                        <AvatarFallback className="bg-[#FC4C02]/10 text-[#FC4C02] text-xs font-semibold">{athlete.firstname[0]}{athlete.lastname[0]}</AvatarFallback>
                    </Avatar>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 sm:w-72 bg-[#16161d] border border-white/[0.08] text-white shadow-xl rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                        <AvatarImage src={athlete.profile} alt={`${athlete.firstname} ${athlete.lastname}`} />
                        <AvatarFallback className="bg-[#FC4C02]/10 text-[#FC4C02] font-semibold">{athlete.firstname[0]}{athlete.lastname[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h4 className="font-semibold text-sm text-white">{athlete.firstname} {athlete.lastname}</h4>
                        <p className="text-xs text-[#71717a] mt-0.5">{athlete.city}</p>
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-[#71717a] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}