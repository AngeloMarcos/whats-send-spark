import { MessageSquare, Send, List, FileText, Settings, LogOut, MapPin, AlertCircle } from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const menuItems = [
  { title: 'Campanhas', url: '/', icon: Send },
  { title: 'Listas', url: '/lists', icon: List },
  { title: 'Capturar Leads', url: '/capturar-leads', icon: MapPin },
  { title: 'Templates', url: '/templates', icon: FileText },
  { title: 'Configurações', url: '/settings', icon: Settings },
  { title: 'Erros', url: '/erros', icon: AlertCircle },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">Disparo em Massa</h1>
            <p className="text-xs text-sidebar-foreground/70">WhatsApp</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <RouterNavLink 
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                            : 'text-sidebar-foreground hover:bg-sidebar-accent'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-sidebar-foreground/50 truncate">
            {user?.email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}