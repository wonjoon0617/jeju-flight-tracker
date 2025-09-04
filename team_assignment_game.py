import random
import json
import os

class TeamAssignmentGame:
    def __init__(self):
        self.players = ["원준", "영준", "장혁", "현민", "재혁", "태혁", "민재", "민기", "지성", "성일"]
        self.roles = ["탑", "정글", "미드", "원딜", "서폿"]
        self.role_ranges = {
            "탑": (1, 58),
            "정글": (1, 55),
            "미드": (1, 59),
            "원딜": (1, 30),
            "서폿": (1, 47)
        }
        self.used_numbers_file = "used_numbers.json"
        self.used_numbers = self.load_used_numbers()
    
    def load_used_numbers(self):
        """이전에 사용된 숫자들을 로드"""
        if os.path.exists(self.used_numbers_file):
            with open(self.used_numbers_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {role: [] for role in self.roles}
    
    def save_used_numbers(self):
        """사용된 숫자들을 저장"""
        with open(self.used_numbers_file, 'w', encoding='utf-8') as f:
            json.dump(self.used_numbers, f, ensure_ascii=False, indent=2)
    
    def get_unique_number(self, role):
        """역할군에 따라 중복되지 않는 랜덤 숫자 생성"""
        min_val, max_val = self.role_ranges[role]
        used = set(self.used_numbers[role])
        available = [i for i in range(min_val, max_val + 1) if i not in used]
        
        if not available:
            raise ValueError(f"{role} 역할에 사용 가능한 숫자가 모두 소진되었습니다!")
        
        number = random.choice(available)
        self.used_numbers[role].append(number)
        return number
    
    def assign_teams(self):
        """팀 배정 (원준과 영준은 서로 다른 팀)"""
        other_players = [p for p in self.players if p not in ["원준", "영준"]]
        random.shuffle(other_players)
        
        # 원준과 영준을 다른 팀에 배치
        if random.choice([True, False]):
            team1 = ["원준"] + other_players[:4]
            team2 = ["영준"] + other_players[4:]
        else:
            team1 = ["영준"] + other_players[:4]
            team2 = ["원준"] + other_players[4:]
        
        return team1, team2
    
    def assign_roles(self, team):
        """팀 내 역할 배정"""
        random.shuffle(team)
        role_assignment = {}
        
        for i, role in enumerate(self.roles):
            player = team[i]
            number = self.get_unique_number(role)
            role_assignment[role] = {
                "player": player,
                "number": number
            }
        
        return role_assignment
    
    def generate_game(self):
        """게임 생성"""
        print("=== 랜덤 숫자 뽑기 팀 배정 게임 ===\n")
        
        # 팀 배정
        team1, team2 = self.assign_teams()
        
        print("📋 팀 배정:")
        print(f"1팀: {', '.join(team1)}")
        print(f"2팀: {', '.join(team2)}\n")
        
        # 역할 및 숫자 배정
        print("🎲 역할 및 랜덤 숫자 배정:\n")
        
        team1_roles = self.assign_roles(team1)
        team2_roles = self.assign_roles(team2)
        
        print("【1팀】")
        for role, info in team1_roles.items():
            print(f"{role}: {info['player']} (#{info['number']})")
        
        print("\n【2팀】")
        for role, info in team2_roles.items():
            print(f"{role}: {info['player']} (#{info['number']})")
        
        # 사용된 숫자 저장
        self.save_used_numbers()
        
        print(f"\n💾 사용된 숫자들이 {self.used_numbers_file}에 저장되었습니다.")
        
        return {
            "team1": {"players": team1, "roles": team1_roles},
            "team2": {"players": team2, "roles": team2_roles}
        }
    
    def show_used_numbers(self):
        """사용된 숫자들 현황 표시"""
        print("📊 사용된 숫자 현황:")
        for role in self.roles:
            used = self.used_numbers[role]
            total = self.role_ranges[role][1] - self.role_ranges[role][0] + 1
            print(f"{role}: {len(used)}/{total} 사용됨 - {sorted(used) if used else '없음'}")
    
    def reset_used_numbers(self):
        """사용된 숫자 초기화"""
        self.used_numbers = {role: [] for role in self.roles}
        self.save_used_numbers()
        print("🔄 사용된 숫자가 초기화되었습니다.")

def main():
    game = TeamAssignmentGame()
    
    while True:
        print("\n" + "="*50)
        print("1. 게임 시작")
        print("2. 사용된 숫자 현황 보기")
        print("3. 사용된 숫자 초기화")
        print("4. 종료")
        print("="*50)
        
        choice = input("선택하세요 (1-4): ").strip()
        
        if choice == "1":
            try:
                game.generate_game()
            except ValueError as e:
                print(f"❌ 오류: {e}")
        elif choice == "2":
            game.show_used_numbers()
        elif choice == "3":
            confirm = input("정말로 초기화하시겠습니까? (y/N): ").strip().lower()
            if confirm == 'y':
                game.reset_used_numbers()
        elif choice == "4":
            print("게임을 종료합니다.")
            break
        else:
            print("올바른 번호를 선택해주세요.")

if __name__ == "__main__":
    main()