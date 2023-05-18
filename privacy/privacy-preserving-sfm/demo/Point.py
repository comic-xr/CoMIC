class Point:
	def __init__(self, init_x, init_y):
		self.x = init_x
		self.y = init_y

	def __str__(self):
		return f'({self.x}, {self.y})'
